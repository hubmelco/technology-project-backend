const { PutCommand, GetCommand, ScanCommand, QueryCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { TableName, runCommand, CLASS_POST, flaggedIndex } = require('../utilities/dynamoUtilities');

const sendPost = async (Item) => {
    const command = new PutCommand({
        TableName: TableName,
        Item
    });
    return await runCommand(command);
};

const sendReply = async (reply, id) => {
    const command = new UpdateCommand({
        TableName,
        Key: { "class": CLASS_POST, "itemID": id },
        ExpressionAttributeValues: {
            ":reply": [reply]
        },
        UpdateExpression: "SET replies = list_append(replies, :reply)",
        ReturnValues: "UPDATED_NEW"
    });
    return await runCommand(command);
};

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
    })
    return await runCommand(command);
};

const getPost = async (id) => {
    const command = new GetCommand({
        TableName,
        Key: { class: CLASS_POST, itemID: id }
    });
    return await runCommand(command);
}

const sendLike = async (like, id) => {
    const command = new UpdateCommand({
        TableName,
        Key: { "class": CLASS_POST, "itemID": id },
        ExpressionAttributeValues: {
            ":r": [like]
        },
        UpdateExpression: "SET likedBy = list_append(likedBy, :r)",
        ReturnValues: "UPDATED_NEW"
    });
    return await runCommand(command);
}

async function removeLike(index, id) {
    const command = new UpdateCommand({
        TableName,
        Key: { "class": CLASS_POST, "itemID": id },
        UpdateExpression: "REMOVE likedBy[" + index + "]",
        ReturnValues: "UPDATED_NEW"
    });
    return await runCommand(command);
};

const deletePost = async (id) => {
    const command = new DeleteCommand({
        TableName,
        Key: { class: CLASS_POST, itemID: id }
    });
    return await runCommand(command);
};

async function updatePost(id, attributes) {
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

async function updatePostFlag(id, flag) {
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

async function getFlaggedPost(isFlagged) {
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

module.exports = {
    sendPost,
    sendReply,
    getPost,
    scanPosts,
    getFlaggedPost,
    updatePost,
    updatePostFlag,
    sendLike,
    removeLike,
    deletePost
};