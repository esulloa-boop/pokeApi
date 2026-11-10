/** Referencia a un recurso de PokéAPI. */
export interface NamedApiResource {
  name: string;
  url: string;
}

/** Respuesta paginada del endpoint /pokemon. */
export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedApiResource[];
}

/** Datos que necesita cada elemento del listado. */
export interface PokemonSummary {
  id: number;
  name: string;
  image: string;
}

export interface PokemonPage {
  count: number;
  next: string | null;
  results: PokemonSummary[];
}

/** Campos del endpoint /pokemon/{id o nombre} usados por la aplicación. */
export interface PokemonDetail {
  id: number;
  name: string;
  /** Altura original en decímetros; dividir entre 10 para obtener metros. */
  height: number;
  /** Peso original en hectogramos; dividir entre 10 para obtener kilogramos. */
  weight: number;
  types: {
    slot: number;
    type: NamedApiResource;
  }[];
  stats: {
    base_stat: number;
    effort: number;
    stat: NamedApiResource;
  }[];
  abilities: {
    is_hidden: boolean;
    slot: number;
    ability: NamedApiResource;
  }[];
  sprites: {
    front_default: string | null;
    other: {
      'official-artwork': {
        front_default: string | null;
      };
    };
  };
}
