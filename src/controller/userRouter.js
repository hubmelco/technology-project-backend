const express = require('express');
const userService = require('../services/userService');
const userMiddleware = require('../middleware/userMiddleware');
const authMiddleware = require("../middleware/authMiddleware");
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
userRouter.post("/", userMiddleware.validateUsername(), userMiddleware.validatePassword(), async (req, res) => {
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
userRouter.post("/login", userMiddleware.validateUsername(), userMiddleware.validatePassword(), async (req, res) => {
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
userRouter.put("/:id", authMiddleware.accountOwnerAuthenticate(), async (req, res) => {
    const { id } = req.params;
    const requestBody = req.body;

    try {
        const updatedUser = await userService.updateUser(id, requestBody);
        res.status(200).json({message: "User has been updated", updatedUser});
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
userRouter.delete("/:id", authMiddleware.adminAuthenticate(), async (req, res) => {
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
userRouter.patch("/:id/role", authMiddleware.adminAuthenticate(), userMiddleware.validateRole(), async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        await userService.updateRole(id, role);
        return res.status(200).json({ message: `User role changed to ${role}` });
    } catch (err) {
        handleServiceError(err, res);
    }
});

module.exports = {
    userRouter
};