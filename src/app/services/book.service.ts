import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Book } from '../models/book.model';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private apiUrl = 'http://localhost:3000/api/books'; // Backend API Endpoint

  constructor(private http: HttpClient) {}

  /**
   * Fetch books from backend API
   */
  getBooks(searchQuery?: string, sortBy?: string): Observable<Book[]> {
    let params = new HttpParams();
    if (searchQuery) {
      params = params.set('search', searchQuery);
    }
    if (sortBy) {
      params = params.set('sort', sortBy);
    }

    return this.http.get<Book[]>(this.apiUrl, { params }).pipe(
      catchError((error) => {
        console.warn('Backend API not connected or returned empty:', error.message);
        return of([]); // Return empty list when backend is not returning books
      })
    );
  }

  /**
   * Fetch single book by ID from backend API
   */
  getBookById(id: number | string): Observable<Book | undefined> {
    return this.http.get<Book>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        return of(undefined);
      })
    );
  }
}
