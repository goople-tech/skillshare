# Auth0 setup (passwordless email, UBC only)

Login = Auth0 emails a one-time code to the user's UBC address. The backend then verifies the token and
rejects any email that isn't on the UBC list (`UBC_SUFFIXES` in `backend/app/auth.py`).

## 1. Create the tenant and app (Auth0 dashboard, free plan is fine)
1. **Applications → Create Application** → *Single Page Web Applications* (React).
2. In its **Settings**, set all three to `http://localhost:5173`:
   - Allowed Callback URLs
   - Allowed Logout URLs
   - Allowed Web Origins
3. Copy the **Domain** and **Client ID**.

## 2. Create the API
**Applications → APIs → Create API**
- Identifier (audience): `https://ubchub-api`
- Signing algorithm: RS256

## 3. Turn on passwordless email
1. **Authentication → Passwordless → Email** → enable. Set *OTP* (code), not magic link.
2. Under the connection's **Applications** tab, enable your SPA.
3. **Applications → your app → Connections**: turn off *Username-Password-Authentication* and any social
   logins so the email code is the only way in.

## 4. (Optional, recommended) Block non-UBC emails at Auth0 too
**Actions → Library → Build Custom → trigger: Pre User Registration**

```js
exports.onExecutePreUserRegistration = async (event, api) => {
  const ok = /@(student\.|alum\.|students\.cs\.)?ubc\.ca$/i.test(event.user.email || "");
  if (!ok) api.access.deny("not_ubc", "Please use your UBC email.");
};
```
Deploy it, then add it to **Actions → Triggers → pre-user-registration**.
(The backend check still applies either way; this just stops non-UBC users getting an emailed code.)

## 5. Fill in the env files (never commit these)
`backend/.env`
```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://ubchub-api
```
`frontend/.env`
```
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=<client id>
VITE_AUTH0_AUDIENCE=https://ubchub-api
VITE_API_URL=http://localhost:8000
```
Restart both servers after editing env files.

Note: Auth0's built-in email sender is rate-limited. For the demo it's fine, but configure your own provider
(**Branding → Email Provider**) if you see delivery limits.
