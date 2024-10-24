const { isValidBodyProperty } = require("../utilities/routerUtilities");

const validRoles = ["user", "admin"];

function validateUsername(req, res, next) {
    if (isValidBodyProperty(req, res, "username")) {
        next();
    }
}

function validatePassword(req, res, next) {
    if (isValidBodyProperty(req, res, "password")) {
        next();
    }
}

function validateRole(req, res, next) {
    const role = req.body.role;
    const isValidRole = validRoles.includes(role);
    if (isValidRole) {
        next();
        return;
    }
    res.status(400).json({ message: `Invalid role ${role}` });
}

function validateUser(req, res, next) {
    const {id} = req.params;
    const {itemID, role} = res.locals.user
    if (role !== "admin" && id !== itemID) {
        return res.status(401).json({message: "You are not the account owner"})
    }
    next();
}

module.exports = {
    validateUsername,
    validatePassword,
    validateRole,
    validateUser,
};