const { PutCommand, QueryCommand, DeleteCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { TableName, UsernameIndex, CLASS_USER, runCommand } = require('../utilities/dynamoUtilities');
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const uuid = require("uuid");

async function putUser(Item) {
    const command = new PutCommand({
        TableName,
        Item,
        ConditionExpression: "attribute_not_exists(itemID)"
    });
    const response = await runCommand(command);
    return response;
}

async function queryByUsername(username) {
    const command = new QueryCommand({
        TableName,
        IndexName: UsernameIndex,
        KeyConditionExpression: "#class = :class AND #username = :username",
        ExpressionAttributeNames: {
            "#class": "class",
            "#username": "username"
        },
        ExpressionAttributeValues: {
            ":username": username,
            ":class": CLASS_USER
        }
    });
    const response = await runCommand(command);
    return response;
}

async function getUserById(userId) {
    const command = new GetCommand({
        TableName,
        Key: {
            class: CLASS_USER,
            itemID: userId
        }
    });
    const response = await runCommand(command);
    return response;
}

async function updateRole(id, role) {
    const command = new UpdateCommand({
        TableName,
        Key: {
            class: CLASS_USER,
            itemID: id
        },
        UpdateExpression: "set #role = :role",
        ExpressionAttributeNames: {
            "#role": "role"
        },
        ExpressionAttributeValues: {
            ":role": role
        }
    });
    const response = await runCommand(command);
    return response;
}

async function updateUser(userId, requestBody) {
    const command = new UpdateCommand({
        TableName,
        Key: {
            class: CLASS_USER,
            itemID: userId
        },
        UpdateExpression: "set #username = :username, #bio = :bio, #genres = :genres, #profileImage = :profileImage",
        ExpressionAttributeNames: {
            "#username": "username",
            "#bio": "bio",
            "#genres": "genres",
            "#profileImage": "profileImage",
        },
        ExpressionAttributeValues: {
            ":username": requestBody.username,
            ":bio": requestBody.bio,
            ":genres": requestBody.genres,
            ":profileImage": requestBody.profileImage,
        },
        ReturnValues: "ALL_NEW"
    });
    const response = await runCommand(command);
    return response;
}

const deleteUser = async (id) => {
    const command = new DeleteCommand({
        TableName,
        Key: { class: CLASS_USER, itemID: id }
    });
    await runCommand(command);
}

async function uploadImage(imageBuffer, extension) {
    const parallelUploads3 = new Upload({
        client: new S3Client({region: "us-east-2"}),
        params: { Bucket: "techprojectmedia", Key: `images/${uuid.v4()}.${extension}`, Body: imageBuffer },
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false,
      });
      parallelUploads3.on("httpUploadProgress", (progress) => {
        console.log(progress);
      });
      try {
        const {Location} = await parallelUploads3.done();
        return {url: Location};
      } catch {
        // Some S3 error occured
        return Promise.reject({status: 502, message: "Upstream server error"})
      }
}

async function deleteImage(Key) {
    const client = new S3Client({region: "us-east-2"});
    const command = new DeleteObjectCommand({
        Bucket: "techprojectmedia",
        Key
    });
    try {
        return await client.send(command);
    } catch (err) {
        console.log(err);
        return Promise.reject({status: 502, message: "Upstream server error"});
    }
}

module.exports = {
    putUser,
    queryByUsername,
    getUserById,
    updateUser,
    updateRole,
    deleteUser,
    uploadImage,
    deleteImage,
};