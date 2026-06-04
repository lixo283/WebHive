const DEFAULT_JWT_SECRET = 'change_me_super_secret';
const EXAMPLE_JWT_SECRET = 'replace-with-at-least-32-random-characters';

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (!secret || secret === DEFAULT_JWT_SECRET || secret === EXAMPLE_JWT_SECRET || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 non-default characters');
  }

  return secret;
}

module.exports = {
  getJwtSecret,
};
