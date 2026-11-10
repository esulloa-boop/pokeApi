import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError, timeout } from 'rxjs';
import {
  PokemonDetail,
  PokemonListResponse,
  PokemonPage,
  PokemonSummary,
} from '../models/pokemon.model';

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://pokeapi.co/api/v2/pokemon';
  private readonly artworkUrl =
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
  private readonly pages = new Map<string, Observable<PokemonPage>>();
  private readonly pokemon = new Map<string, Observable<PokemonDetail>>();

  getPokemonPage(offset = 0, limit = 25): Observable<PokemonPage> {
    const key = `${offset}:${limit}`;
    const cached = this.pages.get(key);
    if (cached) return cached;

    const params = new HttpParams().set('offset', offset).set('limit', limit);
    const request = this.http.get<PokemonListResponse>(this.apiUrl, { params }).pipe(
      timeout(20_000),
      map((response): PokemonPage => ({
        count: response.count,
        next: response.next,
        results: response.results.map((resource) => {
          const match = resource.url.match(/\/pokemon\/(\d+)\/?$/);
          if (!match) throw new Error('La API devolvió un identificador de Pokémon inválido.');
          const id = Number(match[1]);
          return { id, name: resource.name, image: `${this.artworkUrl}/${id}.png` };
        }),
      })),
      catchError((error: unknown) => {
        // Una petición fallida no debe impedir que el usuario vuelva a intentarlo.
        this.pages.delete(key);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.pages.set(key, request);
    return request;
  }

  getPokemon(id: string | number): Observable<PokemonDetail> {
    const normalized = String(id).trim().toLowerCase();
    const key = /^\d+$/.test(normalized)
      ? normalized.replace(/^0+(?=\d)/, '')
      : normalized;
    if (!/^[a-z0-9-]+$/.test(key)) {
      return throwError(() => new Error('Introduce un nombre o un número de Pokémon válido.'));
    }
    const cached = this.pokemon.get(key);
    if (cached) return cached;

    const request = this.http.get<PokemonDetail>(`${this.apiUrl}/${encodeURIComponent(key)}`).pipe(
      timeout(20_000),
      catchError((error: unknown) => {
        this.pokemon.delete(key);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.pokemon.set(key, request);
    return request;
  }

  toSummary(pokemon: PokemonDetail): PokemonSummary {
    return {
      id: pokemon.id,
      name: pokemon.name,
      image: pokemon.sprites.other['official-artwork'].front_default
        ?? pokemon.sprites.front_default
        ?? `${this.artworkUrl}/${pokemon.id}.png`,
    };
  }
}
