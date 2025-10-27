import React, { useState, useEffect, useMemo } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface PreviewProps {
  code: string | null;
}

const Preview: React.FC<PreviewProps> = ({ code }) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [evaluationError, setEvaluationError] = useState<Error | null>(null);

  useEffect(() => {
    if (!code) {
      setComponent(null);
      return;
    }

    try {
      const exports: { default?: React.ComponentType } = {};
      const module = { exports };
      
      const customRequire = (moduleName: string) => {
        if (moduleName === 'react') {
          // 'React' is available globally from the CDN script in index.html
          // @ts-ignore
          return React;
        }
        throw new Error(`Cannot find module '${moduleName}'. External modules are not supported.`);
      };
      
      // We are creating a sandboxed function where we can provide our own 'require', 'module', and 'exports'.
      // This mimics a CommonJS environment to run the Babel-transpiled code.
      // @ts-ignore
      new Function('require', 'module', 'exports', code)(customRequire, module, exports);
      
      // Babel transpiles `export default Foo` to `exports.default = Foo` or `module.exports.default = Foo`
      const exportedComponent = module.exports.default as React.ComponentType | undefined;
      
      if (exportedComponent && typeof exportedComponent === 'function') {
        setComponent(() => exportedComponent); // Use functional update to store the component type
        setEvaluationError(null);
      } else {
        throw new Error('No default export found. Make sure your component is the default export.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEvaluationError(err);
      } else {
        setEvaluationError(new Error('An unknown evaluation error occurred.'));
      }
      setComponent(null);
    }
  }, [code]);

  const RenderedComponent = useMemo(() => {
    if (evaluationError) {
      return (
        <div className="p-4 m-4 bg-red-100 border-l-4 border-red-500 text-red-800">
          <h3 className="font-bold">Evaluation Error</h3>
          <p>There was an error when trying to run your code.</p>
          <pre className="mt-2 text-sm whitespace-pre-wrap bg-red-50 p-2 rounded">
            {evaluationError.toString()}
          </pre>
        </div>
      );
    }

    if (Component) {
      return (
        <ErrorBoundary>
          <Component />
        </ErrorBoundary>
      );
    }
    
    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            Waiting for valid code...
        </div>
    );
  }, [Component, evaluationError]);

  return (
    <div className="w-full h-full overflow-auto">
        {RenderedComponent}
    </div>
  );
};

export default Preview;