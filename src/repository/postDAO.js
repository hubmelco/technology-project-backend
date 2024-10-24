const { PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { TableName, runCommand, flaggedIndex, CLASS_POST, postedByIndex } = require('../utilities/dynamoUtilities');

const sendPost = async (post) => {
    const command = new PutCommand({
        TableName,
        Item: post
    });
    return await runCommand(command);
}

const scanPosts = async () => {
    const command = new ScanCommand({
        TableName,
        FilterExpression: "#class = :class",
        ExpressionAttributeNames: {
            "#class": "class"
        },
        ExpressionAttributeValues: {
            ":class": CLASS_POST
        }
    });
    const response = await runCommand(command);
    return response;
}

const sendReply = async (postId, reply) => {
    const command = new UpdateCommand({
        TableName,
        Key: { "class": CLASS_POST, "itemID": postId },
        ExpressionAttributeValues: {
            ":reply": [reply]
        },
        UpdateExpression: "SET replies = list_append(replies, :reply)",
        ReturnValues: "UPDATED_NEW"
    });
    return await runCommand(command);
}

const sendLike = async (like, id) => {
    const command = new UpdateCommand({
        TableName,
        Key: {"class": CLASS_POST, "itemID": id},
        ExpressionAttributeValues: {
            ":r": [like]
        },
        UpdateExpression: "SET likedBy = list_append(likedBy, :r)",
        ReturnValues: "UPDATED_NEW"
    });
    return await runCommand(command);
}

const removeLike = async (index, id) => {
    const command = new UpdateCommand({
        TableName,
        Key: {"class": CLASS_POST, "itemID": id},
        UpdateExpression: "REMOVE likedBy["+index+"]",
        ReturnValues: "UPDATED_NEW"
    });
    return await runCommand(command);
}

const updatePost = async (id, attributes) => {
    const command = new UpdateCommand({
        TableName,
        Key: {class: CLASS_POST, itemID: id},
        UpdateExpression: "SET #description = :description, #score = :score, #title = :title, #isFlagged = :isFlagged",
        ExpressionAttributeNames: {
            "#description": "description",
            "#score": "score",
            "#title": "title",
            "#isFlagged": "isFlagged" 
        },
        ExpressionAttributeValues: {
            ":description": attributes.description,
            ":title": attributes.title,
            ":score": attributes.score,
            ":isFlagged": attributes.isFlagged
        }
    })
    return await runCommand(command);
}

const getPost = async (postId) => {
    const command = new GetCommand({
        TableName,
        Key: { class: CLASS_POST, itemID: postId }
    });
    return await runCommand(command);
}

const updatePostFlag = async (id, flag) => {
    const command = new UpdateCommand({
        TableName,
        Key: {class: CLASS_POST, itemID: id},
        UpdateExpression: "SET #isFlagged = :isFlagged",
        ExpressionAttributeNames: {
            "#isFlagged": "isFlagged" 
        },
        ExpressionAttributeValues: {
            ":isFlagged": flag
        }
    })
    return await runCommand(command);
}

const getFlaggedPost = async (isFlagged) => {
    const command = new QueryCommand({
        TableName,
        IndexName: flaggedIndex,
        KeyConditionExpression: "#class = :class AND #isFlagged = :isFlagged",
        ExpressionAttributeNames: {
            "#class": "class",
            "#isFlagged": "isFlagged"
        },
        ExpressionAttributeValues: {
            ":isFlagged": isFlagged,
            ":class": CLASS_POST
        }
    })
    const result = await runCommand(command);
    return result
}

const updateReplies = async (postId, replies) => {
    const command = new UpdateCommand({
        TableName,
        Key: { "class": CLASS_POST, "itemID": postId },
        UpdateExpression: "SET replies = :replies",
        ExpressionAttributeValues: {
            ":replies": replies
        },
        ReturnValues: "UPDATED_NEW"
    });
    return await runCommand(command);
}

const deletePost = async (postId) => {
    const command = new DeleteCommand({
        TableName,
        Key: { class: CLASS_POST, itemID: postId }
    });
    return await runCommand(command);
}

const getPostsByPostedBy = async (postedBy) => {
    const command = new QueryCommand({
        TableName,
        IndexName: postedByIndex,
        KeyConditionExpression: "#class = :class AND #postedBy = :postedBy",
        ExpressionAttributeNames: {
            "#class": "class",
            "#postedBy": "postedBy"
        },
        ExpressionAttributeValues: {
            ":postedBy": postedBy,
            ":class": CLASS_POST
        }
    });
    return await runCommand(command);
}

module.exports = {
    sendPost,
    scanPosts,
    sendReply,
    sendLike,
    removeLike,
    updatePost,
    getPost,
    updatePostFlag,
    getFlaggedPost,
    updateReplies,
    deletePost,
    getPostsByPostedBy,
};