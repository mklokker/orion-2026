export default function Removedor() {
  return (
    <div 
      className="w-full" 
      style={{ 
        height: 'calc(100vh - 64px)',
        WebkitOverflowScrolling: 'touch',
        overflow: 'auto'
      }}
    >
      <iframe
        src="https://www.trt20.jus.br/standalone/removedorcaracter/index.php"
        className="w-full h-full border-0"
        title="Removedor de Caracteres"
        allowFullScreen
      />
    </div>
  );
}