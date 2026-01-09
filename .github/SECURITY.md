# Security Policy

## Supported Versions

We provide security updates for the following versions. Always use the latest stable release for optimal security.

| Version | Supported | Security Updates Until |
| ------- | --------- | ---------------------- |
| 1.x.x   | Yes       | Active development     |
| 0.x.x   | No        | Ended                  |

---

## Reporting a Vulnerability

> [!WARNING]
> **DO NOT** report security vulnerabilities through public GitHub issues, or pull requests.

### Preferred Reporting Method

**Email**: [liora.bot.official@gmail.com](mailto:liora.bot.official@gmail.com?subject=Security%20Vulnerability%20Report)

### Required Information

When reporting a vulnerability, please include:

1. **Vulnerability Description**
    - Clear, detailed explanation of the issue
    - Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)

2. **Impact Assessment**
    - Potential risks and consequences
    - Affected components or modules
    - Attack scenarios

3. **Reproduction Steps**
    - Step-by-step instructions to reproduce
    - Required preconditions
    - Expected vs actual behavior

4. **Environment Details**
    - Operating system and version
    - Bun version
    - Liora version
    - Relevant configuration details

5. **Proof of Concept**
    - Code snippets demonstrating the issue
    - Screenshots or videos if applicable
    - Command sequences used

6. **Suggested Remediation** (Optional)
    - Proposed fixes or mitigations
    - Security best practices applicable

### Response Timeline

| Stage                  | Timeframe                     |
| ---------------------- | ----------------------------- |
| Initial acknowledgment | 24-48 hours                   |
| Preliminary assessment | 3-5 days                      |
| Regular status updates | Weekly                        |
| Resolution timeline    | Based on severity (see below) |

---

## Severity Classification and Response

### Critical Severity

**Criteria:**

- Remote code execution
- Authentication bypass
- Privilege escalation
- Data exfiltration at scale

**Response:**

- Initial response: 24 hours
- Patch development: 24-48 hours
- Release: Immediate emergency patch
- Disclosure: 7 days after patch release

### High Severity

**Criteria:**

- SQL injection
- Cross-site scripting (XSS)
- Insecure deserialization
- Sensitive data exposure

**Response:**

- Initial response: 48 hours
- Patch development: 3-5 days
- Release: Next patch release (expedited)
- Disclosure: 14 days after patch release

### Medium Severity

**Criteria:**

- Denial of service
- Information disclosure (limited)
- Security misconfiguration
- Insecure defaults

**Response:**

- Initial response: 3-5 days
- Patch development: 7-14 days
- Release: Scheduled patch release
- Disclosure: 30 days after patch release

### Low Severity

**Criteria:**

- Minor information leaks
- Security warnings
- Best practice violations
- Non-exploitable bugs

**Response:**

- Initial response: 5-7 days
- Patch development: 14-30 days
- Release: Next minor version
- Disclosure: With release notes

---

## Security Update Policy

### Patch Distribution

- **Critical/High**: Immediate notification to all users via GitHub Security Advisory
- **Medium**: Included in next scheduled release with security notes
- **Low**: Documented in release changelog

### Communication Channels

1. GitHub Security Advisories
2. Release notes and changelog
3. Email to repository watchers (critical only)
4. Security section in README

---

## Security Features

### Application Security

**Input Validation**

- Comprehensive sanitization of all user inputs
- Whitelist-based validation where possible
- Type checking and schema validation
- Length and format constraints

**Output Encoding**

- Context-aware output escaping
- Prevention of injection attacks
- Safe rendering of user content

**Authentication & Authorization**

- Secure session management
- Role-based access control (RBAC)
- Principle of least privilege

**Data Protection**

- Encryption at rest for sensitive data
- Secure credential storage
- No hardcoded secrets

### Infrastructure Security

**Dependency Management**

- Automated dependency scanning
- Regular security audits
- Timely updates for vulnerable packages
- Minimal dependency footprint

**Code Analysis**

- Static Application Security Testing (SAST)
- Automated code review
- Security-focused linting rules

**Runtime Security**

- Resource limits (CPU, memory)
- Sandboxed plugin execution
- File system access controls
- Network request validation

### Deployment Security

**Production Best Practices**

- Run as non-root user
- Restricted file permissions
- Environment variable management
- Secure defaults configuration

**Monitoring & Logging**

- Security event logging
- Anomaly detection
- Rate limiting
- Failed authentication tracking

---

## Security Checklist for Deployments

### Pre-Deployment

- [ ] Update to latest stable version
- [ ] Review and customize `.env` configuration
- [ ] Set strong, unique credentials
- [ ] Configure appropriate access controls
- [ ] Review enabled features and plugins
- [ ] Run security audit: `bun audit`

### Deployment

- [ ] Use dedicated system user (non-root)
- [ ] Set restrictive file permissions (600 for configs)
- [ ] Enable firewall rules
- [ ] Configure reverse proxy (if applicable)
- [ ] Enable HTTPS/TLS
- [ ] Set up log monitoring

### Post-Deployment

- [ ] Verify security configuration
- [ ] Test authentication mechanisms
- [ ] Review access logs
- [ ] Set up automated backups
- [ ] Configure update notifications
- [ ] Document security procedures

---

## Known Security Considerations

### File Upload Security

If enabling file uploads:

- Validate file types strictly
- Scan for malware
- Limit file sizes
- Store outside web root
- Generate unique filenames

### Database Security

For `bun:sqlite`:

- Set restrictive file permissions (600)
- Regular backups
- Avoid storing sensitive data unencrypted
- Use prepared statements

---

## Security Resources

### Recommended Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

### Security Tools

- `bun audit` - Dependency vulnerability scanning
- [Snyk](https://snyk.io/) - Continuous security monitoring
- [GitHub Dependabot](https://github.com/dependabot) - Automated updates

---

## Disclosure Policy

### Coordinated Disclosure

We practice coordinated disclosure:

1. **Reporter contacts us** with vulnerability details
2. **We acknowledge** within 24-48 hours
3. **We investigate** and develop a patch
4. **We notify reporter** of patch timeline
5. **We release patch** according to severity timeline
6. **We publish advisory** after users have time to update
7. **We credit reporter** (if desired) in advisory

### Public Disclosure

Public disclosure occurs after:

- Patch is available and released
- Sufficient time for users to update (7-30 days based on severity)
- Coordination with reporter

---

## Security Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities:

### 2026

_No vulnerabilities reported yet_

### How to be Listed

- Report a valid security vulnerability
- Follow responsible disclosure practices
- Provide clear, actionable information
- Give permission to credit you publicly

---

## Contact

**Security Team**: liora.bot.official@gmail.com  
**PGP Key**: Available upon request  
**Response Time**: 24-48 hours for initial acknowledgment

---

## Legal

Security research conducted in good faith will not result in legal action, provided:

- Research does not violate laws or regulations
- Research does not compromise user data or privacy
- Findings are reported responsibly
- Research is not performed on production systems without permission
