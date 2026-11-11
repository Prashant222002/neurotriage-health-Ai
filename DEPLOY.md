# Deploy (NeuroTriage split build)

1. Repo root me purani `index.html` hatao. Is folder ka sab kuch copy karo:
   index.html, sw.js, offline.html, js/, css/, media/
   (apk-banner.js, icons, manifest, privacy files, api/ waise hi rahenge)
2. `vercel.headers.json` ke "headers" ko apni `vercel.json` me merge karo
   (js/css/media 1 saal cache, sw.js aur index.html no-cache).
3. Deploy ke baad browser me hard refresh karo, phir DevTools > Application > Service Workers
   me dekho "activated" dikh raha ho.
4. Naya code deploy karne par sw.js ka version badalna zaroori hai, warna purane user ko
   purana cache milega (naya build tool ye khud karta hai).

`source-readable/` me original blocks unminified hain (sirf padhne/edit ke liye, deploy me nahi jaate).
