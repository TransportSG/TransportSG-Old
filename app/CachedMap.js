class CachedMap {

    constructor(timeToLive) {
        this.timeToLive = timeToLive;
        this.map = {};
    }

    put(key, value) {
        this.map[key] = {
            insertionTime: new Date(),
            value: value
        }
    }

    get(key) {
        if (this.map[key]) {
            var item = this.map[key];
            var age = new Date() - item.insertionTime;
            if (age >= this.timeToLive) {
                delete this.map[key];
                return {
                    value: null,
                    age: -1
                };
            } return {
                value: item.value,
                age
            };
        } return {
            value: null,
            age: -1
        };
    }

}

module.exports = CachedMap;
