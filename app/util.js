exports.asyncMap = (array, asyncFunction, mapper, callback) => {
    var promises = [];
    var result = [];
    var left = array.length;

    array.forEach((item, i) => {
        asyncFunction(item, i, array).then(val => {
            result.push(mapper(val, array[i]));
            left--;
            if (left == 0) callback(result);
        });
    });

}
