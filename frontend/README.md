# React + Vite

## API URL Ayarı

Bu projede backend API adresi environment variable ile yönetilmektedir. Yayına almadan önce veya geliştirme sırasında `frontend/.env` dosyasına aşağıdaki satırı ekleyin:

```
VITE_API_URL=https://audio-summarizer-f29w.onrender.com
```

Geliştirme ortamında backend farklı bir adreste çalışıyorsa, bu URL'yi ona göre değiştirin.

## Diğer Bilgiler

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
