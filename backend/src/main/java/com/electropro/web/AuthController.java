package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    record LoginInput(@NotBlank String email, @NotBlank String password) {}

    record LoginResult(String token, AppUser.Role role, String fullName) {}

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final String dummyHash;

    AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    @PostMapping("/login")
    LoginResult login(@Valid @RequestBody LoginInput in) {
        AppUser u = users.findByEmailIgnoreCase(in.email().trim()).orElse(null);
        // Même travail de hachage que le compte existe ou non, et même message : on ne révèle pas quels e-mails existent.
        boolean ok = encoder.matches(in.password(), u != null ? u.getPasswordHash() : dummyHash);
        if (u == null || !ok || !u.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou mot de passe incorrect.");
        }
        return new LoginResult(jwt.generate(u), u.getRole(), u.getFullName());
    }
}
