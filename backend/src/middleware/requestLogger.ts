import morgan from 'morgan';
import logger from '../utils/logger';

// Simple Morgan setup with basic functionality
export const requestLogger = () => {
  // Basic request logging
  return [
    morgan((tokens, req, res) => {
      const method = tokens.method(req, res);
      const url = tokens.url(req, res);
      const status = tokens.status(req, res);
      const responseTime = tokens['response-time'](req, res);
      
      const logMessage = `${method} ${url} ${status} - ${responseTime}ms`;
      
      const statusCode = parseInt(status || '200');
      if (statusCode >= 400) {
        logger.error(logMessage);
      } else {
        logger.http(logMessage);
      }
      
      return ''; // Don't output to console since we're handling via winston
    }, {
      skip: (req, res): boolean => {
        // Skip health checks in production
        if (process.env.NODE_ENV === 'production') {
          return req.url === '/api/health' || (req.url !== undefined && req.url.startsWith('/uploads/'));
        }
        return false;
      }
    })
  ];
};

// Debug logger
export const detailedRequestLogger = morgan((tokens, req, res) => {
  if (process.env.DETAILED_REQUEST_LOGGING === 'true') {
    const logData = {
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      responseTime: tokens['response-time'](req, res),
      userAgent: tokens['user-agent'](req, res),
      date: tokens.date(req, res, 'iso')
    };
    logger.debug('Detailed Request', logData);
  }
  return '';
});

export default requestLogger;