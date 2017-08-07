const CachedMap = require('../app/CachedMap');

describe('The Cached Map', () => {
    it('should allow storing and retreiving of values under TTL', () => {
        var map = new CachedMap(5000);
        map.put(1, 'Test Value');
        expect(map.get(1).value).toEqual('Test Value');
    });

    it('should return null for timings out of TTL', (done) => {
        var map = new CachedMap(50);
        map.put(1, 'Test Value');
        expect(map.get(1).value).toEqual('Test Value');
        setTimeout(() => {
            expect(map.get(1).value).toBeNull();
            done();
        }, 100);
    });

    it('should return null for data not in map', () => {
        var map = new CachedMap(50);
        expect(map.get(1).value).toBeNull();
    });
});
