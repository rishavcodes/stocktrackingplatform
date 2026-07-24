// /lib/nprogress-config.ts
import NProgress from "nprogress";

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  speed: 500,
  minimum: 0.1,
});

export default NProgress;
