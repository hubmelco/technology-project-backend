const express = require('express');
const userService = require('../services/userService');
const userMiddleware = require('../middleware/userMiddleware');
const {  authenticate, adminAuthenticate  } = require("../middleware/authMiddleware");
const { handleServiceError } = require("../utilities/routerUtilities");

const userRouter = express.Router();

/**
 * Registers a new user to the database
 * Request Body
 *      username {string}
 *      password {string}
 * Response
 *      201 - User successfully registered
 *          data - The database entry of the new account without the password
 *      400 - Username already taken
 */
userRouter.post("/", userMiddleware.validateUsername, userMiddleware.validatePassword, async (req, res) => {
    const { username, password } = req.body;

    try {
        const {user, token} = await userService.register(username, password);
        res.status(201).json({
            message: "User successfully registered",
            user,
            token
        });
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Login using an existing account
 * Request Body
 *      username {string}
 *      password {string}
 * Response
 *      200 - Successfully logged in
 *          token - JWT session token, expires after 1 day
 *      400 - Invalid username/password
 */
userRouter.post("/login", userMiddleware.validateUsername, userMiddleware.validatePassword, async (req, res) => {
    const { username, password } = req.body;

    try {
        const {token, user} = await userService.login(username, password);
        res.status(200).json({
            token,
            message: "Successfully logged in",
            user
        });
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Gets a user by their id
 * Path Parameter
 *      :userId {string}
 * Response
 *      200 - Successfully received the user by their id
 *      400 - User with id ${userId} not found
 */
userRouter.get("/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await userService.getUserById(userId);
        res.status(200).json({ user });
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Update a users' profile; request must come from owner of the account
 * Path Parameter
 *      :userId {string} - The id of the user being updated
 * Request Body
 *      username {string}
 *      bio {string}
 *      genres {string[]}
 * Response
 *      200 - User has been updated
 *          updatedUser - The updated values of the user
 *      400 - User with id ${userId} not found
 *      401 - Unauthorized access - wrong user
 */
userRouter.put("/:userId", authenticate, async (req, res) => {
    const userId = req.params.userId;
    const requestBody = req.body;

    if (userId !== res.locals.user.itemID) {
        return res.status(401).json("Unauthorized access - wrong user");
    }

    try {
        const {updatedUser, updatedToken} = await userService.updateUser(userId, requestBody);
        res.status(200).json({message: `User ${userId} has been updated`, updatedUser, updatedToken});
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Delete user from the database
 * Path Parameters
 *      :id {string}
 * Response
 *      200 - Deleted user
 *          data - the id of the deleted user
 */
userRouter.delete("/:id", adminAuthenticate, async (req, res) => {
    const { id } = req.params;
    try {
        await userService.deleteUser(id);
        return res.status(200).json({message: "Deleted user", data: id});
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Changes the role of a user
 * Path Parameters
 *      :id {string}
 * Request Body
 *      role {string}
 * Response
 *      200 - User role changed to ${role}
 *      400 - User with id ${id} not found
 *      400 - User is already role ${role}
 *      400 - Cannot demote admin, use AWS console instead
 */
userRouter.patch("/:id/role", userMiddleware.validateRole, adminAuthenticate, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const token = await userService.updateRole(id, role);
        return res.status(200).json({ message: `User role changed to ${role}`, token });
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Updates the profile image of a user. Admins can change all users' images
 * 
 * INPUT
 * params: id, ID of user to update
 * body: {image: base64 string, extention: file extension string (jpg, png, etc)}
 * 
 * OUTPUT
 * response: 200, {updatedImageURL: string}
 * errors: 
 *  400 - {message:"user not found with specified id", id: ${id}}
 *  401 - {message: "You are not the account owner"}
 */
userRouter.patch("/:id/profile-image", authenticate, userMiddleware.validateUser, async (req, res) => {
    const {id} = req.params;
    const {image} = req.body;
    if (image === undefined) {
        return res.status(400).json({message: "No image data provided in body. Should follow the format {image: {mime: string, data: string}}"});
    }
    const {data, mime} = image;
    if (!data || !mime) {
        return res.status(400).json({message: "data and mime must be defined in image data"});
    }
    const extension = mime.split("/")[1];
    if (!extension) {
        return res.status(400).json({message: "mime format incorrect. must follow 'image/<extension>'"});
    }
    const buffer = Buffer.from(data, "base64");
    try {
        // Since admins can change profile images for users, must get user by id to ensure you delete the right image
        const user = await userService.getUserById(id);
        if (!user) {
            return res.status(400).json({message:"user not found with specified id", id});
        }
        // 3 steps, Upload to S3, delete old image from bucket if not default image, update user info with url
        const {url} = await userService.uploadImage(buffer, extension);
        await userService.deleteImage(user); //Delete old image before updating info otherwise link(used to get key) is lost
        await userService.updateUser(id, {profileImage: url});
        return res.status(200).json({updatedImageURL: url});
    } catch (err) {
        handleServiceError(err, res);
    }
});

module.exports = {
    userRouter
};