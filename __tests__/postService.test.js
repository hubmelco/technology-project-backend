const postService = require("../src/services/postService");
const postDAO = require("../src/repository/postDAO");
const { CLASS_POST } = require("../src/utilities/dynamoUtilities");
const songService = require("../src/services/songService");

jest.mock('../src/repository/postDAO');
jest.mock("../src/utilities/dynamoUtilities");
jest.mock('../src/services/songService');
let mockDatabase = [];
const mockPost1 = {
    class: CLASS_POST,
    itemID: "e7b1998e-77d3-4cad-9955-f20135d840d0",
    postedBy: "95db201c-35bb-47d6-8634-8701a01f496a",
    description: "Hello world",
    score: 50,
    song: "Title",
    replies: [],
    likedBy: [],
    tags: new Map([["rock",true], ["hip-hop",true]])
};
const mockPost2 = {
    class: CLASS_POST,
    itemID: "29ee2056-c74e-4537-ac95-6234a2506426",
    postedBy: "6d737a3b-d543-459b-aca6-d1f04952bf30",
    description: "This is a great song",
    score: 100,
    song: "Title",
    replies: [],
    likedBy: [],
    tags: new Map([["drill",true]])
};
const mockReply1 = {
    itemID: "f2194fa8-afab-4ed0-9904-2d5af3142aff",
    postedBy: mockPost2.postedBy,
    description: "Hello there"
}

beforeAll(() => {
    // Mock postDAO here
    postDAO.sendPost.mockImplementation(async (post) => {
        mockDatabase.push(post);
        return {
            $metadata: {
                httpStatusCode: 201
            }
        };
    });
    postDAO.getPost.mockImplementation(async (postId) => {
        for (let i = 0; i < mockDatabase.length; i++){
            if (mockDatabase[i].itemID === postId){
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
    postDAO.sendReply.mockImplementation(async (postId, reply) => {
        for (let i = 0; i < mockDatabase.length; i++){
            if (mockDatabase[i].itemID === postId){
                mockDatabase[i].replies.push(reply);
                return {
                    $metadata: {
                        httpStatusCode: 201
                    }
                };
            }
        }
    });
    postDAO.sendLike.mockImplementation(async (like, id) =>{
        const post = await postDAO.getPost(id);
        post.Item.likedBy.push(like);
        post.Item.replies.push(reply);
        return {
            $metadata: {
                httpStatusCode: 200
            }
        };
    });
    postDAO.sendLike.mockImplementation(async (like, id) =>{
        const post = await postDAO.getPost(id);
        post.Item.likedBy.push(like);
        for (let i = 0; i < mockDatabase.length; i++){
            if (mockDatabase[i].itemID == post.Item.itemID){
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
        for (let i = 0; i < mockDatabase.length; i++){
            if (mockDatabase[i].itemID == post.Item.itemID){
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
    postDAO.updateReplies.mockImplementation(async (postId, replies) => {
        for (let i = 0; i < mockDatabase.length; i++) {
            if (mockDatabase[i].itemID === postId) {
                mockDatabase[i].replies = replies;
                return {
                    $metadata: {
                        httpStatusCode: 200
                    }
                };
            }
        }
    });
    postDAO.scanPosts.mockImplementation(async () => {
        return {
            $metadata: {
                httpStatusCode: 200
            },
            Items: mockDatabase
        };
    });
    songService.getSongs.mockImplementation(async (query, offset = 0) => {
        return {
            $metadata: {
                httpStatusCode: 200
            },
            songs: [{name: query.track, artists: [{name: query.artist}]}]
        };
    });
});

beforeEach(() => {
    // Reset database
    mockDatabase = [];
    mockDatabase.push(mockPost1);
    mockDatabase.push(mockPost2);
    postDAO.sendPost.mockClear();
    postDAO.sendReply.mockClear();
    postDAO.getPost.mockClear();
    postDAO.sendLike.mockClear();
    postDAO.removeLike.mockClear();
    postDAO.updateReplies.mockClear();
    postDAO.scanPosts.mockClear();
});

describe('createPost test', () => {
    it('Successful post creation', async () => {
        const userId = "95db201c-35bb-47d6-8634-8701a01f496a";
        const text = "Decent song";
        const score = 69;
        const song = "Hello";

        const response = await postService.createPost(userId, text, score, song);
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
        const attributes = await postService.updatePost("filler", post, updates);

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

        await postService.updatePostFlag(id, flag);

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
            await postService.getFlaggedPost(isFlagged);
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

        const flaggedPosts = await postService.getFlaggedPost(isFlagged);

        expect(postDAO.getFlaggedPost.mock.calls.length).toBe(1);
        expect(postDAO.getFlaggedPost.mock.calls[0][0]).toBe(isFlagged);
        expect(flaggedPosts).toEqual([]);

    })
})

describe('createReply test', () => {
    it('Successful reply creation', async () => {
        const userId = "6d737a3b-d543-459b-aca6-d1f04952bf30";
        const postId = mockPost1.itemID;
        const text = "I agree";

        await postService.createReply(userId, postId, text);
        let added = false;
        mockDatabase.forEach((post) => {
            if (post.itemID === postId && post.replies.length > 0) {
                added = true;
            }
        });
        expect(added).toBeTruthy();
    });
});

describe('checkLike test', () => {
    it('Successful like post', async () => {
        const id = mockPost1.itemID;
        const like = 1;
        const userID = "f162b963-6b4e-4033-9159-2e0c13d78419";

        await postService.checkLike(like, id, userID);
        let added = false;
        mockDatabase.forEach((post) => {
            if (post.itemID == id){
                for (const i of post.likedBy){
                    if(i.userID == userID && i.like == 1){
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

        await postService.checkLike(like, id, userID);
        let added = false;
        mockDatabase.forEach((post) => {
            if (post.itemID == id){
                for (const i of post.likedBy){
                    if (i.userID == userID && i.like == -1){
                        added = true;
                    }
                    if (i.userID == userID && i.like == 1){
                        added = false;
                        return;
                    }
                }
            }
        });
        expect(added).toBeTruthy();
    });
});

describe('Delete reply tests', () => {
    it('Successful reply deletion', async () => {
        mockDatabase[0].replies.push(mockReply1);
        
        const postId = mockPost1.itemID;
        const replyId = mockReply1.itemID;

        await postService.deleteReply(postId, replyId);
        let isDeleted = true;
        mockDatabase.forEach((post) => {
            if (post.itemID === postId) {
                post.replies.forEach((reply) => {
                    if (reply.itemID === replyId) {
                        isDeleted = false;
                    }
                })
            }
        });
        expect(isDeleted).toBeTruthy();
    });

    it('Throws error when post is not found', async () => {
        const postId = "invalid_postId";
        const replyId = mockReply1.itemID;

        let error;
        try {
            await postService.deleteReply(postId, replyId);
        } catch(err) {
            error = err;
        }
        expect(error.status).toEqual(400);
    });

    it('Throws error when reply is not found', async () => {
        const postId = mockPost1.itemID;
        const replyId = "invalid_replyId";

        let error;
        try {
            await postService.deleteReply(postId, replyId);
        } catch(err) {
            error = err;
        }
        expect(error.status).toEqual(400);
    });
});
describe('checkTags test', () => {
    it('Successful search on rock (inclusive)', async () => {
        const tag = ["rock"];
        let added = false;

        const result = await postService.checkTags(tag, 1);
        added = (result.length == 1);
        expect(added).toBeTruthy();
    });
    it('Bad search on rap (inclusive)', async () => {
        const tag = ["rap"];
        let added = false;

        const result = await postService.checkTags(tag, 1);
        added = (result.length == 0)
        expect(added).toBeTruthy();
    });
    it('Bad search on rock (non-inclusive)', async () => {
        const tag = ["rock","rap"];
        let added = false;

        const result = await postService.checkTags(tag, 0);
        added = (result.length == 0);
        expect(added).toBeTruthy();
    });
    it('Successful search on rock (non-inclusive)', async () => {
        const tag = ["rock","hip-hop"];
        let added = false;

        const result = await postService.checkTags(tag, 0);
        added = (result.length == 1);
        expect(added).toBeTruthy();
    });
});