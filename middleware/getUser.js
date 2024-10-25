const { ObjectId } = require("mongodb");

const getUser = function (userId, callBack) {
  const database = global.database; // Access the global database
  database.collection("users").findOne(
    {
      _id: ObjectId(userId),
    },
    function (error, result) {
      if (error) {
        console.log(error);
        return;
      }
      if (callBack != null) {
        callBack(result);
      }
    }
  );
};

module.exports = getUser;
