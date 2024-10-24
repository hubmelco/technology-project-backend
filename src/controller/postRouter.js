const express = require('express');
const postService = require('../services/postService');
const { handleServiceError } = require('../utilities/routerUtilities');
const { authenticate, postOwnerOrAdminAuthenticate, replyOwnerOrAdminAuthenticate } = require("../middleware/authMiddleware");
const postMiddleware = require('../middleware/postMiddleware');

const postRouter = express.Router();

/**
 * Creates a new post in the database
 * Request Body
 *      title {string}
 *      score {number}
 *      text {string}
 *      tags {string,string,...}
 * Response
 *      200 - Post successfully created
 */
postRouter.post("/", authenticate, postMiddleware.validateTextBody, postMiddleware.validateScore, async (req, res) => {
    //TODO check song title exists in API
    const userId = res.locals.user.itemID;
    const { text, score, title, tags } = req.body;

    try {
        const post = await postService.createPost(userId, text, score, title, tags);
        res.status(201).json({
            message: `Post successfully created`,
            post
        });
    } catch (err) {
        handleServiceError(err, res);
    }
});

postRouter.patch("/:postId", authenticate, async (req, res) => {
    const { postId } = req.params;
    const { user } = res.locals;
    const userId = user.itemID;

    try {
        const post = await postService.getPostById(postId);
        if (user.role === "user" && post.postedBy !== userId) {
            const { flag } = req.body;
            await postService.updatePostFlag(postId, flag);
            return res.status(200).json({ postId, updated: { isFlagged: flag } });
        } else if (user.role === "admin" || post.postedBy === userId) {
            // Only get updatable fields from the body
            const { description, title, score } = req.body;
            let { flag } = req.body;
            if (flag !== undefined && post.postedBy === userId) {
                flag = undefined; // Users cannot flag/unflag their own post
            }
            const updated = await postService.updatePost(postId, post, { description: description, title: title, score: score, isFlagged: flag });
            return res.status(200).json({ postId, updated });
        }
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Gets a post by their id
 * Path Parameter
 *      :postId {string}
 * Response
 *      200 - Successfully received the post by their id
 *      400 - Post with id ${postId} not found
 */
postRouter.get("/:postId", async (req, res) => {
    const { postId } = req.params;

    try {
        const post = await postService.getPostById(postId);
        res.status(200).json({ post });
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Get all posts
 * Response
 *      200
 *          posts - Array of retrieved posts
 */
postRouter.get("/", async (req, res) => {
    let {isFlagged, postedBy} = req.query;
    if (isFlagged !== undefined) {
        isFlagged = parseInt(isFlagged);
        // Since 0 is falsy we need to confirm its not 0
        if (!isFlagged && isFlagged !== 0) {
            return res.status(400).json({ message: "isFlagged query must be 0 or 1" })
        }
        try {
            const flaggedPost = await postService.getFlaggedPost(isFlagged);
            return res.status(200).json({ flaggedPost });
        } catch (err) {
            handleServiceError(err, res);
        }
    } else if (postedBy !== undefined && postedBy !== "") {
        try {
            const posts = await postService.getPostsByPostedBy(postedBy);
            return res.status(200).json({ posts });
        } catch (err) {
            handleServiceError(err, res);
        }
    }else {
        //TODO check song title exists in API
        try {
            const posts = await postService.seePosts();
            res.status(200).json({ posts });
        } catch (err) {
            handleServiceError(err, res);
        }
    }
});

postRouter.get("/tags", async (req, res) => {
    try {
        const posts = await postService.checkTags(req.query.tags, req.query.inclusive);
        res.status(200).json({
            Posts: posts
        });
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Add a reply to an existing post
 * Path Parameter
 *      :postId {string}
 * Request Body
 *      text {string}
 * Response
 *      200 - Reply successfully created
 *      400 - That post doesn't exist
 */
postRouter.patch("/:postId/replies", authenticate, postMiddleware.validateTextBody, async (req, res) => {
    //TODO check song title exists in API
    const userId = res.locals.user.itemID;
    const { postId } = req.params;
    const { text } = req.body;

    try {
        const reply = await postService.createReply(userId, postId, text);
        res.status(201).json({
            message: `Replied to ${postId} successfully`,
            reply
        });
    } catch (err) {
        handleServiceError(err, res);
    }
});

postRouter.patch("/:postId/likes", authenticate, postMiddleware.validateLike, async (req, res) => {
    //TODO check song title exists in API
    const { like } = req.body;
    const { postId } = req.params;
    const userId = res.locals.user.itemID;

    try {
        await postService.checkLike(like, postId, userId);
        if (req.body.like == 1){
            res.status(200).json({ message: `Liked post ${postId} successfully` });
        }
        else {
            res.status(200).json({ message: `Disliked post ${postId} successfully` });
        }
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Deletes a post by their id
 * Path Parameter
 *      :postId {string}
 * Response
 *      200 - Successfully deleted the post by their id
 *      400 - Post with id ${postId} not found
 */
postRouter.delete("/:postId", postOwnerOrAdminAuthenticate, async (req, res) => {
    const { postId } = req.params;

    try {
        await postService.deletePost(postId);
        res.status(200).json({ message: "Deleted post", postId });
    } catch (err) {
        handleServiceError(err, res);
    }
});

/**
 * Deletes a reply by their id
 * Path Parameter
 *      :postId {string}
 *      :replyId {string}
 * Response
 *      200 - Successfully deleted the reply by their id
 *      400 - Post with id ${postId} not found or reply with id ${replyId} not found
 */
postRouter.delete("/:postId/replies/:replyId", replyOwnerOrAdminAuthenticate, async (req, res) => {
    const { postId, replyId } = req.params;

    try {
        await postService.deleteReply(postId, replyId);
        res.status(200).json({ message: "Deleted reply", replyId });
    } catch (err) {
        handleServiceError(err, res);
    }
});

module.exports = {
    postRouter
};