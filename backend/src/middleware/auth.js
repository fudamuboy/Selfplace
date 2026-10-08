const jwt = require('jsonwebtoken');

function getLanguage(req) {
  const lang = req.headers['x-app-language'] || req.query?.language || 'tr';
  return lang === 'en' ? 'en' : 'tr';
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[ 1 ];
  const isEn = getLanguage(req) === 'en';

  if (token == null) {
    return res.status(401).json({ message: isEn ? 'Authentication error: Token not found.' : 'Yetkilendirme hatası: Token bulunamadı.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: isEn ? 'Invalid or expired token.' : 'Geçersiz veya süresi dolmuş token.' });
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
