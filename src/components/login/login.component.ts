import { Component, ChangeDetectionStrategy, signal, inject, NgZone, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements AfterViewInit {
  passwordFieldType = signal<'password' | 'text'>('password');
  isSubmitting = signal(false);

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  // Corrected typo from `Elementef` to `ElementRef`.
  private elementRef = inject(ElementRef);

  loginForm = new FormGroup({
    username: new FormControl('admin', [Validators.required]),
    password: new FormControl('admin', [Validators.required]),
  });

  ngAfterViewInit(): void {
    this.initializeGoogleSignIn();
  }

  private initializeGoogleSignIn(): void {
    if (typeof google === 'undefined') {
      console.error("Google's GSI client script not loaded.");
      return;
    }
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: this.handleGoogleSignIn.bind(this),
    });
    
    const googleButtonContainer = this.elementRef.nativeElement.querySelector('#google-signin-button');
    if (googleButtonContainer) {
      google.accounts.id.renderButton(
        googleButtonContainer,
        { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with', shape: 'rectangular', width: '300' }
      );
    }
  }

  private handleGoogleSignIn(response: any): void {
    this.ngZone.run(() => {
      this.isSubmitting.set(true);
      this.authService.loginWithGoogle(response.credential).subscribe({
        next: (loginResponse) => {
          this.isSubmitting.set(false);
          if (loginResponse) {
            this.notificationService.show('Login com Google realizado com sucesso!', 'success');
            this.router.navigate(['/dashboard']);
          } else {
            this.notificationService.show('Login com Google falhou. Verifique se seu e-mail está autorizado.', 'error');
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.notificationService.show('Ocorreu um erro na autenticação com Google.', 'error');
        },
      });
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);

    const { username, password } = this.loginForm.getRawValue();

    this.authService.login(username!, password!).subscribe(response => {
      this.isSubmitting.set(false);
      if (response) {
        this.notificationService.show('Login realizado com sucesso!', 'success');
        this.router.navigate(['/dashboard']);
      } else {
        this.notificationService.show('Usuário ou senha inválidos.', 'error');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType.update(type => (type === 'password' ? 'text' : 'password'));
  }
}