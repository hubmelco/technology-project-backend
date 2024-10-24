const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Table & Index names
const TableName = "Technology_Project";
const UsernameIndex = "username-index";
const flaggedIndex = "class-isFlagged-index";
const postedByIndex= "class-postedBy-index";

// Class attribute constants
const CLASS_USER = "user";
const CLASS_POST = "post";

const client = new DynamoDBClient({ region: "us-east-2" });
const documentClient = DynamoDBDocumentClient.from(client);

async function runCommand(command) {
    try {
        const data = await documentClient.send(command);
        return data;
    } catch (err) {
        console.error(err);
        return err;
    }
}

function throwIfError(result) {
    const statusCode = result ? result.$metadata.httpStatusCode : 500;
    if (statusCode >= 400) {
        throw {
            status: 500,
            message: "Internal Server Error"
        };
    }
}

module.exports = {
    TableName,
    UsernameIndex,
    flaggedIndex,
    CLASS_USER,
    CLASS_POST,
    runCommand,
    throwIfError,
    postedByIndex,
};