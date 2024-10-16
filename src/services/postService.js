const uuid = require("uuid");
const { throwIfError, CLASS_POST } = require('../utilities/dynamoUtilities');
const postDAO = require("../repository/postDAO");

const createPost = async (userID, description, score, title) => {
    const post = {class: CLASS_POST, itemID: uuid.v4(), postedBy: userID, description, score, title, replies: [], likedBy: [], isFlagged: 0};
    const data = await postDAO.sendPost(post);
    throwIfError(data);
    delete(post.class);
    return post;
}

async function updatePost(id, post, attributes) {
    const {description, title, score, isFlagged} = attributes;
    const error = {status: 400, message: ""};
    if (isFlagged !== undefined && (typeof(isFlagged) !== "number" || (isFlagged > 1 || isFlagged < 0))) {
        error.message = "provided flag must be a number (0 or 1)";
        throw error
    }
    if (description === undefined && title === undefined && score === undefined && isFlagged === undefined) {
        error.message = "No updatable attributes provided. Must provide description, title, flag, or score in body (flag is not valid if you are the poster)";
        throw error
    }
    if (score !== undefined && typeof(score) !== "number") {
        error.message = "provided score must be of type number";
        throw error;
    }
    if (description !== undefined && typeof(description) !== "string") {
        error.message = "provided description must be of type string";
        throw error;
    }
    if (title !== undefined && typeof(title) !== "string") {
        error.message = "provided title must be of type string";
        throw error;
    }

    Object.keys(attributes).forEach((key) => {
        if (attributes[key] === undefined) {
            attributes[key] = post[key];
        }
    });
    const result = await postDAO.updatePost(id, attributes);
    throwIfError(result);
    return attributes;
}

async function getPost(id) {
    const post = await postDAO.getPost(id);
    if (!post.Item) {
        throw {status: 400, message: `Post not found with id: ${id}`};
    }
    return post;
}

async function updatePostFlag(id, flag) {
    const error = {status: 400, message: ""};
    //Can't update, can only flag if not an admin or the poster
    if (flag === undefined) {
        error.message = "flag must be provided in body";
        throw error;
    }
    if ((typeof(flag) !== "number" || (flag > 1 || flag < 0))) {
        error.message = "provided flag must be a number (0 or 1)";
        throw error;
    }
    const result = await postDAO.updatePostFlag(id, flag);
    throwIfError(result);
}

async function getFlaggedPost(isFlagged) {
    if (isFlagged > 1 || isFlagged < 0) {
        throw {status: 400, message: "isFlagged must be 0 or 1"};
    }
    const result = await postDAO.getFlaggedPost(isFlagged);
    throwIfError(result);
    return result.Items;
}

async function createReply(userID, text, id){
    await getPostById(id);
    const reply = {postedBy: userID, description: text, itemID: uuid.v4()};
    const data = await postDAO.sendReply(reply, id);
    throwIfError(data);
    return reply;
}

const getPostById = async (id) => {
    const getPostResult = await postDAO.getPost(id);
    throwIfError(getPostResult);
    const foundPost = getPostResult.Item;
    if (!foundPost) {
        throw {
            status: 400,
            message: `Post ${id} not found`
        }
    }

    return foundPost;
}

const seePosts = async () => {
    const posts = await postDAO.scanPosts();
    throwIfError(posts);
    return posts.Items;
}

const deletePost = async (id) => {
    await getPostById(id);

    const deleteResult = await postDAO.deletePost(id);
    throwIfError(deleteResult);
}

const checkLike = async (like, postID, userID) => {
    const userLike = { userID, like };
    const post = await getPostById(postID);
    const likeList = post.likedBy;
    for (let i = 0; i < likeList.length; i++) {
        if (likeList[i].userID == userID) {
            if (likeList[i].like == like) {
                if (like == 1) {
                    throw { status: 400, message: `You already liked post ${postID}` };
                }
                throw { status: 400, message: `You already disliked post ${postID}` };
            }
            //Remember to have frontend update like/dislike because you changed your mind
            const data = await postDAO.removeLike(i, postID);
            throwIfError(data);
            break;
        }
    }
    const postData = await postDAO.sendLike(userLike, postID);
    throwIfError(postData);
    return postData;
}

module.exports = {
    createPost,
    getPost,
    updatePostFlag,
    getFlaggedPost,
    createReply,
    getPostById,
    seePosts,
    checkLike,
    updatePost,
    deletePost
};