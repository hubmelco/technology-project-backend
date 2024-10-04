const jwt = require('jsonwebtoken');
const fs = require('fs');

function findToken(req){
    const authHeader = req.headers["authorization"];
    return (authHeader && authHeader.split(" ")[1]);
}

function createToken(user) {
    const key = fs.readFileSync('./key.txt', (err, data) => {
        if (err) throw err;
        return data.toString();
    });
    const token = jwt.sign(
        {
            ItemID: user.ItemID,
            Username: user.Username,
            Role: user.Role,
            Favorites: user.Favorites
        },
        key,
        {
            expiresIn: "50m"
        }
    );
    return token;
}

function decodeJWT(token) {
    try {
        const key = fs.readFileSync('./key.txt', (err, data) => {
            if (err) throw err;
            return data.toString();
        });
        const user = jwt.verify(token, key);
        return user;
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    createToken,
    decodeJWT,
    findToken
};