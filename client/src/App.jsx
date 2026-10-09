import {Link,Navigate,Route,Routes} from 'react-router-dom';
import {Layout} from './components/Layout.jsx';
import {ProtectedRoute} from './routes/ProtectedRoute.jsx';
import {paths} from './routes/paths.js';
import {Login} from './pages/Login.jsx';
import {Register} from './pages/Register.jsx';
import {Sessions} from './pages/Sessions.jsx';
import {MyBookings} from './pages/MyBookings.jsx';
import {FrontDesk} from './pages/FrontDesk.jsx';

function NotFound(){
  return (
    <div className="pagehead">
      <p className="eyebrow">404</p>
      <h1>No such page.</h1>
      <p className="prose">
        That address does not belong to anything here. <Link to={paths.sessions}>Back to the timetable</Link>.
      </p>
    </div>
  );
}

export function App(){
  return (
    <Routes>
      <Route path={paths.login} element={<Login />} />
      <Route path={paths.register} element={<Register />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path={paths.sessions} element={<Sessions />} />
        <Route path={paths.myBookings} element={<MyBookings />} />
        <Route
          path={paths.frontDesk}
          element={<ProtectedRoute role="admin"><FrontDesk /></ProtectedRoute>}
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/" element={<Navigate to={paths.sessions} replace />} />
    </Routes>
  );
}
