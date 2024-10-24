const { isValidBodyProperty } = require("../utilities/routerUtilities");

const validRoles = ["user", "admin"];

function validateUsername(req, res, next) {
    if (isValidBodyProperty(req, res, "username")) {
        if (req.body.username.length < 4){
            return res.status(400).json({message: "Username must be at least 4 characters long"});
        }
        if (/[A-Za-z0-9]/.test(req.body.username)){
            return res.status(400).json({message: "Username must contain a letter or number"});
        }
        next();
    }
}

function validatePassword(req, res, next) {
    if (isValidBodyProperty(req, res, "password")) {
        if (req.body.password.length < 6){
            return res.status(400).json({message: "Password must be at least 6 characters long"});
        }
        if (!/[^A-Za-z0-9]/.test(req.body.password) || !/\d/.test(req.body.password)){
            return res.status(400).json({message: "Password must contain a special character and a number"});
        }
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

module.exports = {
    validateUsername,
    validatePassword,
    validateRole
};