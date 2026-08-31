package org.openconsent;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public final class OpenConsentFilter extends OncePerRequestFilter {
  public static final String GPC_ATTRIBUTE = "openConsent.gpc";
  @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
    request.setAttribute(GPC_ATTRIBUTE, "1".equals(request.getHeader("Sec-GPC")));
    chain.doFilter(request, response);
  }
}
