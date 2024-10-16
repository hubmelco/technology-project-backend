const { validateBody } = require("../utilities/routerUtilities");
const { isValidString } = require("../utilities/stringUtilities");

const validRoles = ["user", "admin"];

function validateUsername() {
    return validateBody("username", (username) => isValidString(username));
}

function validatePassword() {
    return validateBody("password", (password) => isValidString(password));
}

function validateRole() {
    return validateBody("role", (role) => validRoles.includes(role));
}

module.exports = {
    validateUsername,
    validatePassword,
    validateRole
};