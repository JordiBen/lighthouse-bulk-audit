# Image ships Google Chrome; chrome-launcher finds it automatically (or set CHROME_PATH).
FROM apify/actor-node-puppeteer-chrome:22
COPY --chown=myuser:myuser package*.json ./
RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional --no-audit --no-fund \
 && echo "Node: $(node --version)" && (google-chrome --version || true)
COPY --chown=myuser:myuser . ./
CMD ["npm", "start", "--silent"]
