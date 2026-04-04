import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Hello Tailwind v4!
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Edit <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">src/main.ts</code> to test HMR
      </p>
    </div>
  </div>
`;
