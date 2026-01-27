import ReactDOM from 'react-dom/client';
import { SurfaceRoot } from '../popup/SurfaceRoot';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <SurfaceRoot surface="sidepanel" />
);
