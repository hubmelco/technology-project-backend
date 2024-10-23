const uuid = require("uuid");
const { throwIfError, CLASS_POST } = require('../utilities/dynamoUtilities');
const postDAO = require("../repository/postDAO");

const createPost = async (userId, description, score, song, tags) => {
    let tagMap = new Map();
    if (tags){
        for (const i of tags){
            tagMap.set(i, true);
        }
    }
    const post = { class: CLASS_POST, itemID: uuid.v4(), postedBy: userId, description, score, song, replies: [], likedBy: [], tags: tagMap, isFlagged: 0 };
    const data = await postDAO.sendPost(post);
    throwIfError(data);
    delete(post.class);
    return post;
}

const updatePost = async (id, post, attributes) => {
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

const getPostById = async (postId) => {
    const getPostResult = await postDAO.getPost(postId);
    throwIfError(getPostResult);
    const foundPost = getPostResult.Item;
    if (!foundPost) {
        throw {
            status: 400, message: `Post not found with the id: ${postId}`
        }
    }
    return foundPost;
}

const updatePostFlag = async (id, flag) => {
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

const getFlaggedPost = async (isFlagged) => {
    if (isFlagged > 1 || isFlagged < 0) {
        throw {status: 400, message: "isFlagged must be 0 or 1"};
    }
    const result = await postDAO.getFlaggedPost(isFlagged);
    throwIfError(result);
    return result.Items;
}

const seePosts = async () => {
    const posts = await postDAO.scanPosts();
    throwIfError(posts);
    return posts.Items;
}

const createReply = async (userId, postId, description) => {
    const post = await postDAO.getPost(postId);
    if (!post.Item) {
        throw { status: 400, message: `Post ${postId} doesn't exist` };
    }
    const reply = { itemID: uuid.v4(), postedBy: userId, description };
    const data = await postDAO.sendReply(postId, reply);
    throwIfError(data);
    return reply;
}

const checkLike = async (like, postID, userID) => {
    const userLike = {userID, like};
    const post = await postDAO.getPost(postID);
    if (!post.Item) {
        throw {status: 400, message: `Post ${postID} doesn't exist`};
    }
    const likeList = post.Item.likedBy;
    for (let i = 0; i < likeList.length; i++){
        if (likeList[i].userID == userID){
            if (likeList[i].like == like){
                if (like == 1){
                    throw {status: 400, message: `You already liked post ${postID}`};
                }
                throw {status: 400, message: `You already disliked post ${postID}`};
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

const getReplyOfPost = async (postId, replyId) => {
    const { replies } = await getPostById(postId);
    const foundReply = replies.find((reply) => reply.itemID === replyId);
    if (!foundReply) {
        throw { status: 400, message: `Reply ${replyId} doesn't exist` }
    }
    return foundReply;
}

const deletePost = async (postId) => {
    await getPostById(postId);

    const deleteResult = await postDAO.deletePost(postId);
    throwIfError(deleteResult);
}

const deleteReply = async (postId, replyId) => {
    await getReplyOfPost(postId, replyId);
    
    const { replies } = await getPostById(postId);
    const newReplies = replies.filter((reply) => reply.itemID !== replyId); // tried using splice() but for some reason does not work
    const data = await postDAO.updateReplies(postId, newReplies);
    throwIfError(data);
}

const checkTags = async (tags, inclusive) => {
    const posts = await postDAO.scanPosts();
    throwIfError(posts);
    if (!tags){
        return posts.Items;
    }
    const postSet = new Set();
    if (inclusive == 1){
        for (const post of posts.Items){
            for (const i of tags){
                if (!post.tags){
                    break;
                }
                if (post.tags.has(i)){
                    postSet.add(post);
                    break;
                }
            }
        }
    }
    else {
        for (const post of posts.Items){
            let should = true;
            for (const i of tags){
                if (!post.tags || !post.tags.has(i)){
                    should = false;
                    break;
                }
            }
            if (should){
                postSet.add(post);
            }
        }
    }
    return [...postSet];
}

module.exports = {
    createPost,
    updatePost,
    getPostById,
    updatePostFlag,
    getFlaggedPost,
    seePosts,
    createReply,
    checkLike,
    getReplyOfPost,
    deletePost,
    deleteReply,
    checkTags
};