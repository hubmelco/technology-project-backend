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
        genres: []
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
};

const getUserById = async (userId) => {
    const result = await userDAO.getUserById(userId);
    throwIfError(result);
    const foundUser = result?.Item;
    return foundUser;
};

const getUserByUsername = async (username) => {
    const result = await userDAO.queryByUsername(username);
    throwIfError(result);
    const foundUser = result?.Items[0];
    return foundUser;
};

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
};

const updateUser = async (userId, requestBody) => {
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

    const result = await userDAO.updateUser(userId, requestBody);
    throwIfError(result);
    const updatedUser = result?.Attributes;
    return updatedUser;
};

const deleteUser = async (id) => {
    // Maybe add user exist check here, but not needed since dynamo wont error out with a not found id
    await userDAO.deleteUser(id);
};

function createToken(user) {
    // Delete unneccesarry attributes as needed here
    delete (user.password);

    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1d" });
    return token;
}

module.exports = {
    register,
    login,
    getUserById,
    getUserByUsername,
    updateRole,
    updateUser,
    deleteUser
};