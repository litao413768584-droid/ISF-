import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 捕获错误
const root = document.getElementById('root');
if (!root) {
  console.error('❌ 找不到 root 元素');
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}