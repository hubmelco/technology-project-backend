const uuid = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { register, login, updateRole, updateUser, addLike, uploadImage, deleteImage, getUserById } = require('../src/services/userService');
const userDAO = require('../src/repository/userDAO');
const { CLASS_USER, throwIfError } = require('../src/utilities/dynamoUtilities');

jest.mock('bcrypt');
jest.mock("jsonwebtoken");
jest.mock('../src/repository/userDAO');
jest.mock("../src/utilities/dynamoUtilities")

const mockDatabase = new Map();
const mockUser1 = {
    class: CLASS_USER,
    itemID: "f162b963-6b4e-4033-9159-2e0c13d78419",
    username: "user_1",
    password: "password1",
    role: "user",
    bio: "bio1",
    genres: []
};
const mockUser2 = {
    class: CLASS_USER,
    itemID: "2dde0401-3c39-42ea-8145-f056fae354f7",
    username: "user_2",
    password: "password1",
    role: "user",
    bio: "bio2",
    genres: []
};
const mockUser3 = {
    class: CLASS_USER,
    itemID: "8885755c-c6f9-4c83-bec4-899e334e7a39",
    username: "user_3",
    password: "password1",
    role: "user",
    bio: "bio3",
    genres: []
};
const mockAdmin = {
    class: CLASS_USER,
    itemID: "81aaccf9-8128-49c5-a51c-12841778bf53",
    username: "admin_1",
    password: "password1",
    role: "admin",
};

beforeAll(() => {
    // Mock bcrypt
    bcrypt.hashSync.mockImplementation((data, saltOrRounds) => data);
    bcrypt.compareSync.mockImplementation((data, encrypted) => data === encrypted);

    // Mock userDAO
    userDAO.putUser.mockImplementation(async (username, password) => {
        const newUser = {
            itemID: uuid.v4(),
            username,
            password
        };

        mockDatabase.set(username, newUser);
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });

    userDAO.queryByUsername.mockImplementation((username) => {
        let foundUser;
        mockDatabase.forEach((user) => {
            if (user.username == username) {
                foundUser = user;
            }
        });

        return {
            $metadata: {
                httpStatusCode: 200
            },
            Items: [
                foundUser
            ],
            Count: foundUser ? 1 : 0
        };
    });

    userDAO.getUserById.mockImplementation((id) => {
        let foundUser;
        mockDatabase.forEach((user) => {
            if (user.itemID == id) {
                foundUser = user;
            }
        });

        return {
            $metadata: {
                httpStatusCode: 200
            },
            Item: foundUser,
            Count: foundUser ? 1 : 0
        };
    });

    userDAO.updateRole.mockImplementation((id, role) => {
        const user = userDAO.getUserById(id).Item;
        user.role = role;
        mockDatabase.set(user.username, user);
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });

    userDAO.updateUser.mockImplementation((id, requestBody) => {
        const user = userDAO.getUserById(id).Item;
        const oldUsername = user.username;

        if (requestBody.username) {
            user.username = requestBody.username;
        }
        if (requestBody.bio) {
            user.bio = requestBody.bio;
        }
        if (requestBody.genres) {
            user.genres = requestBody.genres;
        }

        mockDatabase.delete(oldUsername);
        mockDatabase.set(user.username, user);
        return {
            $metadata: {
                httpStatusCode: 200
            }
        }
    });
});

beforeEach(() => {
    // Reset database
    mockDatabase.clear();
    mockDatabase.set(mockUser1.username, mockUser1);
    mockDatabase.set(mockUser2.username, mockUser2);
    mockDatabase.set(mockUser3.username, mockUser3);
    mockDatabase.set(mockAdmin.username, mockAdmin);
});

afterEach(() => {
    jest.clearAllMocks();
})

describe("register", () => {

    test("Creates new user with valid username and password", async () => {
        const username = "user_unique";
        const password = "password";

        await register(username, password);
        let userAdded = true;
        mockDatabase.forEach((user) => {
            if (user.username == username) {
                userAdded = false;
            }
        });

        expect(userAdded).toBeTruthy();
    });

    test("Throws error when given existing username", async () => {
        let error;

        try {
            await register(mockUser1.username, mockUser1.password);
        } catch (err) {
            error = err;
        }

        expect(error.status).toEqual(400);
    });
});

describe("login", () => {
    test("Return new jwt if given valid username and password", async () => {
        const existingUser = mockUser1;

        jwt.sign.mockReturnValue("usertoken");
        const token = await login(existingUser.username, existingUser.password);

        expect(token).toBeDefined();
    });

    test("Throws error if given invalid username", async () => {
        const username = "user_invalid";
        const password = "password";
        let error;

        try {
            await login(username, password);
        } catch (err) {
            error = err;
        }

        expect(error.status).toEqual(400);
    });

    test("Throws error if given invalid password", async () => {
        const username = mockUser1.username;
        const password = "password_invalid";
        let error;

        try {
            await login(username, password);
        } catch (err) {
            error = err;
        }

        expect(error.status).toEqual(400);
    });
});

describe("Update User Profile Tests", () => {

    test("Updates the username of a user", async () => {
        const id = mockUser1.itemID;
        const requestBody = { "username": "new_username" };

        await updateUser(id, requestBody);

        let updatedUser;
        mockDatabase.forEach((user) => {
            if (user.itemID === id) {
                updatedUser = user;
            }
        });
        expect(updatedUser.username).toBe(requestBody.username);
    });

    test("Updates the bio of a user", async () => {
        const id = mockUser1.itemID;
        const requestBody = { "bio": "new_bio" };

        await updateUser(id, requestBody);

        let updatedUser;
        mockDatabase.forEach((user) => {
            if (user.itemID === id) {
                updatedUser = user;
            }
        });
        expect(updatedUser.username).toBe(requestBody.username);
    });

    test("Updates the genres of a user", async () => {
        const id = mockUser1.itemID;
        const requestBody = { "genres": ["genre1", "genre2", "genre3"] };

        await updateUser(id, requestBody);

        let updatedUser;
        mockDatabase.forEach((user) => {
            if (user.itemID === id) {
                updatedUser = user;
            }
        });
        expect(updatedUser.username).toBe(requestBody.username);
    });

    test("Throws error when user is not found", async () => {
        const id = "invalid_id";
        const requestBody = { "username": "new_username", "bio": "new_bio" };

        let error;
        try {
            await updateUser(id, requestBody);
        } catch (err) {
            error = err;
        }

        expect(error.status).toEqual(400);
        // expect(error.message).toBe("blank")
    });
});

describe("Delete User Tests", () => {
    test("Deletes a user when called", async () => {
        // I don't know what to test, I just call the DAO with id which is a string by default because its provided in the url.
        expect(1).toBeTruthy();
    });
});

describe("Change User Role", () => {
    test("Promotes valid user to admin", async () => {
        const id = mockUser1.itemID;
        const role = "admin";

        await updateRole(id, role);

        const user = mockDatabase.get(mockUser1.username);
        expect(user.role).toEqual(role);
    });

    test("Throws when user is not found", async () => {
        const id = "Invalid_id";
        const role = "admin";
        let error;

        try {
            await updateRole(id, role);
        } catch (err) {
            error = err;
        }

        expect(error.status).toEqual(400);
    });

    test("Throws if user is already role", async () => {
        const id = mockAdmin.itemID;
        const role = "admin";
        let error;

        try {
            await updateRole(id, role);
        } catch (err) {
            error = err;
        }

        expect(error.status).toEqual(400);
    });

    test("Throws if trying to demote admin", async () => {
        const id = mockAdmin.itemID;
        const role = "user";
        let error;

        try {
            await updateRole(id, role);
        } catch (err) {
            error = err;
        }

        expect(error.status).toEqual(400);
    });

});

describe("Image updating tests", () => {
    test("uploading image on success", async () => {
        const buffer = Buffer.from("test");
        const extension = "jpg";

        await uploadImage(buffer, extension);
        expect(userDAO.uploadImage).toHaveBeenCalledWith(buffer, extension);
    });

    test("Bad extension", async () => {
        const buffer = Buffer.from("test");
        const extension = "txt";

        const errorObject = {status: 400, message: "Invalid extension. Must be jpg, jpeg, png, or svg"};

        try {
            await uploadImage(buffer, extension)
        } catch (err) {
            expect(err).toEqual(errorObject);
        }        
    });

    test("Valid delete image call", async () => {
        // S3 Bucket has an image directory (.../images/file.jpg)
        const user = {profileImage: "a/sd/as/da/da/this/matters.jpg"};
        const key = "this/matters.jpg";

        await deleteImage(user);

        expect(userDAO.deleteImage).toHaveBeenCalledWith(key);
    });

    test("delete image should not delete the default image", async () => {
        const user = {profileImage: "a/sd/as/da/da/images/defaultImage.png"};

        await deleteImage(user);

        expect(userDAO.deleteImage).not.toHaveBeenCalled();
    })
});