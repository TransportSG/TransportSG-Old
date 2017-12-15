const TextParser = require('../index')

describe('The parser', () => {
    it('should tokenize stuff', () => {
        var parsed = TextParser.tokenize('74 nwab, DD');
        expect(parsed).toEqual(['74', 'nwab', 'DD']);
    });

    it('should parse stuff', () => {
        var parsed = TextParser.parse('74 nwab, DD', {
            service: Number,
            wheelchair: ['wab', 'nwab'],
            type: ['SD', 'DD', 'BD']
        });
        expect(parsed).toEqual({
            service: '74',
            wheelchair: 'nwab',
            type: 'DD'
        });
    });
});
