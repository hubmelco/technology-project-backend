const { createPost, createReply, getPostById, updatePost, updatePostFlag, getFlaggedPost, checkLike, deletePost } = require("../src/services/postService");
const postDAO = require("../src/repository/postDAO");
const { CLASS_POST } = require("../src/utilities/dynamoUtilities");

jest.mock('../src/repository/postDAO');
jest.mock("../src/utilities/dynamoUtilities");
let mockDatabase = [];
const mockPost1 = {
    class: CLASS_POST,
    itemID: "e7b1998e-77d3-4cad-9955-f20135d840d0",
    postedBy: "95db201c-35bb-47d6-8634-8701a01f496a",
    description: "Hello world",
    score: 50,
    title: "Title",
    replies: [],
    likedBy: []
};
const mockPost2 = {
    class: CLASS_POST,
    itemID: "29ee2056-c74e-4537-ac95-6234a2506426",
    postedBy: "6d737a3b-d543-459b-aca6-d1f04952bf30",
    description: "This is a great song",
    score: 100,
    title: "Title",
    replies: [],
    likedBy: []
};

beforeAll(() => {
    // Mock postDAO here
    postDAO.sendPost.mockImplementation(async (post) => {
        mockDatabase.push(post);
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });
    postDAO.getPost.mockImplementation(async (id) => {
        for (let i = 0; i < mockDatabase.length; i++) {
            if (mockDatabase[i].itemID == id) {
                return {
                    $metadata: {
                        httpStatusCode: 200
                    },
                    Item: mockDatabase[i]
                };
            }
        }
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });
    postDAO.updatePost.mockImplementation(async (id, attributes) => {
        for (let i = 0; i < mockDatabase.length; i++) {
            if (mockDatabase[i].itemID == id) {
                Object.keys(attributes).forEach((key) => {
                    mockDatabase[i][key] = attributes[key];
                });
                return {
                    $metadata: {
                        httpStatusCode: 200
                    }
                };
            }
        }
    });
    postDAO.deletePost.mockImplementation(async (id) => {
        for (let i = 0; i < mockDatabase.length; i++) {
            if (mockDatabase[i].itemID == id) {
                mockDatabase.splice(i, 1);
                return {
                    $metadata: {
                        httpStatusCode: 200
                    }
                };
            }
        }
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });
    postDAO.sendReply.mockImplementation(async (reply, id) => {
        const post = await postDAO.getPost(id);
        post.Item.replies.push(reply);
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });
    postDAO.sendLike.mockImplementation(async (like, id) => {
        const post = await postDAO.getPost(id);
        post.Item.likedBy.push(like);
        for (let i = 0; i < mockDatabase.length; i++) {
            if (mockDatabase[i].itemID == post.Item.itemID) {
                mockDatabase[i].likedBy = post.Item.likedBy;
                break;
            }
        }
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });
    postDAO.removeLike.mockImplementation(async (index, id) => {
        const post = await postDAO.getPost(id);
        post.Item.likedBy.splice(index, 1);
        for (let i = 0; i < mockDatabase.length; i++) {
            if (mockDatabase[i].itemID == post.Item.itemID) {
                mockDatabase[i].likedBy = post.Item.likedBy;
                break;
            }
        }
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });
});

beforeEach(() => {
    // Reset database
    mockDatabase = [];
    mockDatabase.push(structuredClone(mockPost1));
    mockDatabase.push(structuredClone(mockPost2));
    postDAO.sendPost.mockClear();
    postDAO.getPost.mockClear();
    postDAO.sendReply.mockClear();
    postDAO.updatePost.mockClear();
    postDAO.sendLike.mockClear();
    postDAO.removeLike.mockClear();
    postDAO.deletePost.mockClear();
});

describe('createPost test', () => {
    it('Successful post creation', async () => {
        const id = "95db201c-35bb-47d6-8634-8701a01f496a";
        const text = "Decent song";
        const score = 69;
        const title = "Hello";

        const response = await createPost(id, text, score, title);
        expect(response).toEqual(mockDatabase[mockDatabase.length - 1]);
    });
});

describe("test suite for updating posts", () => {
    test("Whether unchanged values are assigned correctly", async () => {
        const post = {
            description: "default",
            title: "default",
            score: 100,
            isFlagged: true
        }
        // Pulled from req.body
        const updates = {
            description: undefined,
            score: 80,
            isFlagged: undefined,
            title: "BOO"
        }
        const attributes = await updatePost("filler", post, updates);

        // Merge of post and updates where updates override post where defined and post overrides undefined fields
        const expected = {
            description: post.description,
            title: attributes.title,
            score: attributes.score,
            isFlagged: post.isFlagged
        }

        expect(postDAO.updatePost.mock.calls.length).toBe(1);
        expect(attributes).toEqual(expected);
    });
});

describe("Test suite for flagging posts", () => {
    test("Valid flagging of a post", async () => {
        // id can be any string, no checks
        // retrieved from url param (always a string)
        const id = "random";

        // flag is checked in controller (postman tests)
        const flag = 1;

        await updatePostFlag(id, flag);

        // should call the DAO with the same arguments
        expect(postDAO.updatePostFlag.mock.calls.length).toBe(1);
        expect(postDAO.updatePostFlag.mock.calls[0][0]).toBe("random");
        expect(postDAO.updatePostFlag.mock.calls[0][1]).toBe(1);
    })
});

describe("test suite for viewing flagged post", () => {
    test("isFlagged is out of range", async () => {
        // Type is already checked in router (postman test)
        const isFlagged = 2;

        postDAO.getFlaggedPost.mockResolvedValue({Items: []});

        let error;
        try {
            await getFlaggedPost(isFlagged);
            error = {status: "Should not have succeeded", message: "Should not have succeeded"};
        } catch (err) {
            error = err;
        }
        const {status, message} = error;
        expect(status).toBe(400);
        expect(message).not.toBe("Should not have succeeded");
    });

    test("isFlagged Valid", async () => {
        const isFlagged = 1;

        postDAO.getFlaggedPost.mockResolvedValue({Items: []});

        const flaggedPosts = await getFlaggedPost(isFlagged);

        expect(postDAO.getFlaggedPost.mock.calls.length).toBe(1);
        expect(postDAO.getFlaggedPost.mock.calls[0][0]).toBe(isFlagged);
        expect(flaggedPosts).toEqual([]);

    })
})

describe('createReply test', () => {
    it('Successful reply creation', async () => {
        const userID = "6d737a3b-d543-459b-aca6-d1f04952bf30";
        const text = "I agree";
        const id = mockPost1.itemID;

        await createReply(userID, text, id);
        let added = false;
        mockDatabase.forEach((post) => {
            if (post.itemID == id && post.replies.length > 0) {
                added = true;
            }
        });
        expect(added).toBeTruthy();
    });
});

describe('getPostById', () => {
    it('Successful get post', async () => {
        const id = mockPost1.itemID;
        const expectedDescription = mockPost1.description;

        const post = await getPostById(id);

        expect(post.itemID).toEqual(id);
        expect(post.description).toEqual(expectedDescription);
    });

    it('Throws if post not found', async () => {
        const id = "FakeID";
        let error;
        const expectedStatus = 400;

        try {
            await getPostById(id);
        }
        catch (err) {
            error = err;
        }

        expect(error?.status).toEqual(expectedStatus);
    });
})

describe('updatePost test', () => {
    it('Successful update post', async () => {
        const id = mockPost1.itemID;
        const title = "Different Title";
        const score = 28;
        const description = "New description";

        await updatePost(id, mockPost1, {title, score, description});
        const post = (await postDAO.getPost(id)).Item;

        expect(post.title).toEqual(title);
        expect(post.score).toEqual(score);
        expect(post.description).toEqual(description);
    });

    it('Update only the title', async () => {
        const id = mockPost1.itemID;
        const title = "Another Different Title";
        const score = undefined;
        const description = undefined;
        const expectedScore = mockPost1.score;
        const expectedDescription = mockPost1.description;

        await updatePost(id, mockPost1, {title, score, description});
        const post = (await postDAO.getPost(id)).Item;

        expect(post.title).toEqual(title);
        expect(post.score).toEqual(expectedScore);
        expect(post.description).toEqual(expectedDescription);
    });
});

describe('deletePost test', () => {
    it('Successful delete post', async () => {
        const id = mockPost1.itemID;
        const expectedStatus = 200;
        const expectedPosts = mockDatabase.length - 1;

        await deletePost(id);
        const response = (await postDAO.getPost(id));

        expect(response.Item).toBeFalsy();
        expect(mockDatabase.length).toEqual(expectedPosts);
    });
});

describe('checkLike test', () => {
    it('Successful like post', async () => {
        const id = mockPost1.itemID;
        const like = 1;
        const userID = "f162b963-6b4e-4033-9159-2e0c13d78419";

        await checkLike(like, id, userID);
        let added = false;
        mockDatabase.forEach((post) => {
            if (post.itemID == id) {
                for (const i of post.likedBy) {
                    if (i.userID == userID && i.like == 1) {
                        added = true;
                    }
                }
            }
        });
        expect(added).toBeTruthy();
    });
    it('Successful dislike post on post that was already liked', async () => {
        const id = mockPost1.itemID;
        const like = -1;
        const userID = "f162b963-6b4e-4033-9159-2e0c13d78419";

        await checkLike(like, id, userID);
        let added = false;
        mockDatabase.forEach((post) => {
            if (post.itemID == id) {
                for (const i of post.likedBy) {
                    if (i.userID == userID && i.like == -1) {
                        added = true;
                    }
                    if (i.userID == userID && i.like == 1) {
                        added = false;
                        return;
                    }
                }
            }
        });
        expect(added).toBeTruthy();
    });
});