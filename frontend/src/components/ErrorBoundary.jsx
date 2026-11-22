import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(error){ return {error}; }
  componentDidCatch(error, info){ console.error("UI error", error, info); }
  render(){
    if(this.state.error){
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-red-100 text-center">
            <h1 className="text-lg font-semibold text-[#263b2b]">Une erreur est survenue</h1>
            <p className="mt-2 text-sm text-[#768075]">Rechargez la page. Si le probl?me persiste, v?rifiez la connexion ? l&apos;API.</p>
            <button type="button" onClick={()=>window.location.reload()} className="mt-4 min-h-11 rounded-xl bg-[#4b963b] px-4 text-sm font-semibold text-white">Recharger</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
