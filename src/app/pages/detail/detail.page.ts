import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonProgressBar,
  IonRow,
  IonSkeletonText,
  IonToolbar,
} from '@ionic/angular';
import { catchError, combineLatest, distinctUntilChanged, finalize, map, of, startWith, Subject, switchMap } from 'rxjs';
import { PokemonDetail } from '../../models/pokemon.model';
import { formatPokemonId, formatPokemonName, STAT_LABELS, TYPE_LABELS } from '../../models/pokemon-presentation';
import { PokemonService } from '../../services/pokemon.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [
    IonBackButton, IonBadge, IonButtons, IonButton, IonCard, IonCardContent,
    IonCol, IonContent, IonGrid, IonHeader, IonProgressBar, IonRow,
    IonSkeletonText, IonToolbar,
  ],
  templateUrl: './detail.page.html',
  styleUrl: './detail.page.scss',
})
export class DetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly pokemonService = inject(PokemonService);
  private readonly reload = new Subject<void>();
  private readonly decimal = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

  readonly pokemon = signal<PokemonDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly imageUnavailable = signal(false);
  readonly artwork = computed(() => {
    const pokemon = this.pokemon();
    return pokemon?.sprites.other?.['official-artwork']?.front_default ?? pokemon?.sprites.front_default ?? null;
  });
  readonly totalStats = computed(() => this.pokemon()?.stats.reduce((total, stat) => total + stat.base_stat, 0) ?? 0);
  readonly typeLabels = TYPE_LABELS;
  readonly statLabels = STAT_LABELS;
  readonly formatName = formatPokemonName;
  readonly formatId = formatPokemonId;

  constructor() {
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? ''), distinctUntilChanged()),
      this.reload.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([id]) => {
        this.loading.set(true);
        this.error.set('');
        this.notFound.set(false);
        this.pokemon.set(null);
        this.imageUnavailable.set(false);

        return this.pokemonService.getPokemon(id).pipe(
          catchError((error: unknown) => {
            const notFound = error instanceof HttpErrorResponse && error.status === 404;
            this.notFound.set(notFound);
            this.error.set(notFound
              ? 'No encontramos un Pokémon con ese nombre o número. Regresa al listado y elige otro.'
              : 'No pudimos cargar la información. Comprueba tu conexión a Internet e inténtalo de nuevo.');
            return of(null);
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((pokemon) => this.pokemon.set(pokemon));
  }

  retry(): void {
    this.reload.next();
  }

  metric(value: number): string {
    return this.decimal.format(value / 10);
  }

  statProgress(value: number): number {
    return Math.min(1, Math.max(0, value / 255));
  }
}
