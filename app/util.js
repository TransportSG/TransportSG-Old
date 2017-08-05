exports.asyncMap = (array, asyncFunction, mapper, callback) => {
    var promises = [];
    var result = [];

    array.forEach((item, i) => {
        promises.push(asyncFunction(item, i, array));
    });

    Promise.all(promises).then(values => {
        values.forEach((value, i) => {
            result.push(mapper(value, array[i]));
        });
        callback(result);
    });
}
