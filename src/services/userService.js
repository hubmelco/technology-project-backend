const bcrypt = require('bcrypt');
const uuid = require("uuid");
const jwt = require('jsonwebtoken');
const userDAO = require('../repository/userDAO');
const { throwIfError } = require('../utilities/dynamoUtilities');

const register = async (username, password) => {
    const rounds = 10;
    password = bcrypt.hashSync(password, rounds);

    const userExists = (await userDAO.queryByUsername(username)).Count;
    if (userExists) {
        throw { status: 400, message: "Username already taken" };
    }
    const user = {
        class: "user",
        itemID: uuid.v4(),
        username,
        password,
        role: "user",
        bio: "",
        genres: [],
        profileImage: "https://techprojectmedia.s3.us-east-2.amazonaws.com/images/defaultImage.png"
    }
    const result = await userDAO.putUser(user);
    throwIfError(result);
    delete (user.password);
    delete(user.class);
    const token = createToken(user);
    return {user, token};
}

const login = async (username, password) => {
    const result = await userDAO.queryByUsername(username);
    throwIfError(result);
    const user = result.Items[0];
    if (user && bcrypt.compareSync(password, user.password)) {
        delete(user.class);
        return {token: createToken(user), user};
    }

    throw {
        status: 400,
        message: "Invalid username or password"
    }
}

const updateRole = async (id, role) => {
    const getUserResult = await userDAO.getUserById(id);
    throwIfError(getUserResult);
    const foundUser = getUserResult.Item;
    if (!foundUser) {
        throw {
            status: 400,
            message: `User with id ${id} not found`
        }
    }

    const currentRole = foundUser.role;
    if (currentRole === role) {
        throw {
            status: 400,
            message: `User is already role ${role}`
        }
    } else if (role !== "admin") {
        throw {
            status: 400,
            message: "Cannot demote admin, use AWS console instead"
        }
    }

    const updateResult = await userDAO.updateRole(id, role);
    throwIfError(updateResult);
    return updateResult;
}

async function getUserById(userId) {
    const result = await userDAO.getUserById(userId);
    throwIfError(result);
    const foundUser = result?.Item;
    delete(foundUser?.password);
    delete(foundUser?.class);
    return foundUser;
}

async function updateUser(userId, requestBody) {
    const foundUser = await getUserById(userId);

    if (!foundUser) {
        throw {
            status: 400,
            message: `User with id ${userId} not found`
        }
    }

    if (!requestBody.username) {
        requestBody.username = foundUser.username;
    }
    if (!requestBody.bio) {
        requestBody.bio = foundUser.bio //? foundUser.bio : "";
    }
    if (!requestBody.genres) {
        requestBody.genres = foundUser.genres //? foundUser.genres : [];
    }
    if (!requestBody.profileImage) {
        requestBody.profileImage = foundUser.profileImage
    }

    const result = await userDAO.updateUser(userId, requestBody);
    throwIfError(result);
    const updatedUser = await userDAO.getUserById(userId);
    throwIfError(updatedUser);
    const updatedToken = createToken(updatedUser);
    return {updatedUser, updatedToken};
}

const deleteUser = async (id) => {
    // Maybe add user exist check here, but not needed since dynamo wont error out with a not found id
    await userDAO.deleteUser(id);
}

function createToken(user) {
    // Delete unneccesarry attributes as needed here
    if (Object.hasOwn(user, "password")){
        delete (user.password);
    }

    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1d" });
    return token;
}

async function uploadImage(imageBuffer, extension) {
    if (extension !== "jpg" && extension !== "jpeg" && extension !== "png" && extension !== "svg") {
        return Promise.reject({status:400, message: "Invalid extension. Must be jpg, jpeg, png, or svg"});
    }
    return await userDAO.uploadImage(imageBuffer, extension);
}

async function deleteImage(user) {
    const {profileImage} = user;
    const splitURL = profileImage.split("/");
    const key = splitURL.slice(splitURL.length - 2, splitURL.length).join("/");
    if (key === "images/defaultImage.png") {
        return; // Dont delete the default image for all users
    }
    return await userDAO.deleteImage(key);
}

module.exports = {
    register,
    login,
    updateRole,
    getUserById,
    updateUser,
    deleteUser,
    uploadImage,
    deleteImage,
};