import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBadge, IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel,
  IonList, IonSearchbar, IonSkeletonText, IonSpinner, IonThumbnail, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, refreshOutline, searchOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { PokemonSummary } from '../../models/pokemon.model';
import { formatPokemonId, formatPokemonName } from '../../models/pokemon-presentation';
import { PokemonService } from '../../services/pokemon.service';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [
    DecimalPipe, FormsModule, RouterLink, IonBadge, IonButton, IonContent, IonHeader,
    IonIcon, IonItem, IonLabel, IonList, IonSearchbar, IonSkeletonText, IonSpinner,
    IonThumbnail, IonToolbar,
  ],
  templateUrl: './list.page.html',
  styleUrl: './list.page.scss',
})
export class ListPage implements OnInit {
  private readonly pokemonService = inject(PokemonService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private catalog: PokemonSummary[] = [];
  private nextPage = true;
  private lastSearch = '';

  readonly pokemon = signal<PokemonSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly searchActive = signal(false);
  readonly hasMore = signal(true);
  readonly skeletons = Array.from({ length: 9 }, (_, index) => index);
  readonly formatName = formatPokemonName;
  readonly formatId = formatPokemonId;
  query = '';

  constructor() {
    addIcons({ arrowForwardOutline, refreshOutline, searchOutline });
  }

  ngOnInit(): void { this.loadPage(); }

  loadPage(): void {
    if (this.loading() || this.searchActive() || !this.hasMore()) return;
    this.loading.set(true);
    this.error.set('');
    this.request = this.pokemonService.getPokemonPage(this.catalog.length, 25)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.catalog = [...this.catalog, ...page.results];
          this.nextPage = page.next !== null;
          this.pokemon.set(this.catalog);
          this.total.set(page.count);
          this.hasMore.set(this.nextPage);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No pudimos cargar los Pokémon. Revisa tu conexión e inténtalo de nuevo.');
          this.loading.set(false);
        },
      });
  }

  search(): void {
    const input = this.query.trim().toLowerCase().replace(/^#/, '');
    if (!input) { this.clearSearch(); return; }
    this.request?.unsubscribe();
    this.lastSearch = /^\d+$/.test(input) ? String(Number(input)) : input;
    this.query = this.lastSearch;
    this.searchActive.set(true);
    this.pokemon.set([]);
    this.error.set('');
    this.loading.set(true);
    this.request = this.pokemonService.getPokemon(this.lastSearch)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.pokemon.set([this.pokemonService.toSummary(detail)]);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(error instanceof HttpErrorResponse && error.status === 404
            ? 'No encontramos ese Pokémon. Prueba con su nombre exacto o su número.'
            : 'No pudimos realizar la búsqueda. Usa un nombre como pikachu o un número como 25 y revisa tu conexión.');
          this.loading.set(false);
        },
      });
  }

  clearSearch(): void {
    this.request?.unsubscribe();
    this.query = '';
    this.searchActive.set(false);
    this.error.set('');
    this.loading.set(false);
    this.hasMore.set(this.nextPage);
    this.pokemon.set(this.catalog);
    if (!this.catalog.length) this.loadPage();
  }

  retry(): void {
    if (this.searchActive()) {
      this.query = this.lastSearch;
      this.search();
    } else {
      this.loadPage();
    }
  }

  imageFallback(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = 'assets/pokemon-placeholder.svg';
  }
}
