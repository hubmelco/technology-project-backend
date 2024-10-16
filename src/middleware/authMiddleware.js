const jwt = require("jsonwebtoken");
const { getPostById } = require("../services/postService");
const { getUserById } = require("../services/userService");

const authenticate = () => {
    return isAuthorized(() => true, "");
};

const accountOwnerAuthenticate = () => {
    return isAuthorized((user, req) => {
        const userId = req.params.id;
        return userId === user.itemID;
    }, "Unauthorized Access - Wrong User");
};

const postOwnerAuthenticate = () => {
    return isAuthorized(async (user, req) => {
        const postId = req.params.id;
        const post = await getPostById(postId);
        const postOwner = await getUserById(post.postedBy);
    
        return postOwner.itemID === user.itemID;
    }, "Unauthorized Access - Wrong User");
};

const adminAuthenticate = () => {
    return isAuthorized((user) => user.role === "admin", "Privilege too low");
};

function isAuthorized(isAuthorizedCalledback, onFailMessage) {
    return async (req, res, next) => {
        const token = getToken(req);
        if (!token) {
            return res.status(401).json("Unauthorized Access");
        }

        try {
            const user = jwt.verify(token, process.env.JWT_SECRET);
            const isAuthorized = await isAuthorizedCalledback(user, req);
            if (!isAuthorized) {
                return res.status(401).json({ message: onFailMessage });
            }
            res.locals.user = user;
            next();
        } catch (err) {
            console.log(err);
            return res.status(401).json("Unauthorized Access, try relogging");
        }
    };
}

function getToken(req) {
    const token = req.headers?.authorization && req.headers.authorization.split(" ")[1];
    return token;
}

module.exports = { authenticate, accountOwnerAuthenticate, postOwnerAuthenticate, adminAuthenticate };