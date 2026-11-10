// Respuestas acotadas al contrato de PokéAPI. Las pruebas no necesitan Internet.
export const names = [
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise', 'caterpie', 'metapod', 'butterfree',
  'weedle', 'kakuna', 'beedrill', 'pidgey', 'pidgeotto', 'pidgeot', 'rattata',
  'raticate', 'spearow', 'fearow', 'ekans', 'arbok', 'pikachu', 'raichu',
  'sandshrew', 'sandslash', 'nidoran-f', 'nidorina', 'nidoqueen', 'nidoran-m',
  'nidorino', 'nidoking', 'clefairy', 'clefable', 'vulpix', 'ninetales',
  'jigglypuff', 'wigglytuff', 'zubat', 'golbat', 'oddish', 'gloom', 'vileplume',
  'paras', 'parasect', 'venonat', 'venomoth', 'diglett',
];

const resource = (kind: string, name: string, id: number) => ({
  name,
  url: `https://pokeapi.co/api/v2/${kind}/${id}/`,
});

export function pokemonList(offset: number, limit: number) {
  const end = Math.min(offset + limit, names.length);
  return {
    count: names.length,
    next: end < names.length
      ? `https://pokeapi.co/api/v2/pokemon?offset=${end}&limit=${limit}`
      : null,
    previous: offset > 0
      ? `https://pokeapi.co/api/v2/pokemon?offset=${Math.max(offset - limit, 0)}&limit=${limit}`
      : null,
    results: names.slice(offset, end).map((name, index) => resource('pokemon', name, offset + index + 1)),
  };
}

export function pokemonDetail(identifier: string) {
  const id = /^\d+$/.test(identifier) ? Number(identifier) : names.indexOf(identifier) + 1;
  if (id < 1 || id > names.length) return null;
  const isPikachu = id === 25;
  const values = isPikachu ? [35, 55, 40, 50, 50, 90] : [45, 49, 49, 65, 65, 45];
  return {
    id,
    name: names[id - 1],
    height: isPikachu ? 4 : 7,
    weight: isPikachu ? 60 : 69,
    types: isPikachu
      ? [{ slot: 1, type: resource('type', 'electric', 13) }]
      : [{ slot: 1, type: resource('type', 'grass', 12) }, { slot: 2, type: resource('type', 'poison', 4) }],
    stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name, index) => ({
      base_stat: values[index],
      effort: 0,
      stat: resource('stat', name, index + 1),
    })),
    abilities: [{
      is_hidden: false,
      slot: 1,
      ability: resource('ability', isPikachu ? 'static' : 'overgrow', isPikachu ? 9 : 65),
    }],
    sprites: {
      front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      other: {
        'official-artwork': {
          front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        },
      },
    },
  };
}
