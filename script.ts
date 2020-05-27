import * as ts from "typescript";
import * as fs from "fs";
import {decodeEmptyLines, encodeEmptyLines} from 'ts-empty-line-encoder';

/**
 * Prints out particular nodes from a source file
 * 
 * @param file a path to a file
 * @param identifiers top level identifiers available
 */
function extract(file: string, identifiers: string[]): void {
  // Create a Program to represent the project, then pull out the
  // source file to parse its AST.
  let program = ts.createProgram([file], { allowJs: true });
  let sourceFile = program.getSourceFile(file) as ts.SourceFile;
  
  // To print the AST, we'll use TypeScript's printer
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });


  const configPath = ts.findConfigFile(
    /*searchPath*/ "../web-checkout-service",
    ts.sys.fileExists,
    "tsconfig.json"
  );

  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  const asdf = ts.parseJsonConfigFileContent(
    configFile,
    ts.sys,
   '../web-checkout-service'
  );

  const sourceFileText = encodeEmptyLines(sourceFile.getFullText());

  const sourceCode = ts.createSourceFile(file, sourceFileText, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

  // Loop through the root AST nodes of the file
  ts.forEachChild(sourceCode, node => {


    if (node.kind == ts.SyntaxKind.ImportDeclaration) {
      const moduleSpecifier = ((node as ts.ImportDeclaration).moduleSpecifier as ts.ModuleName);
      (node as ts.ImportDeclaration).moduleSpecifier = { ...moduleSpecifier, text: 'bananas' } as ts.ModuleName
    }
  });

  const outputFile = decodeEmptyLines(printer.printFile(sourceCode));

  console.log(outputFile)
}

// Run the extract function with the script's arguments
extract(process.argv[2], process.argv.slice(3));
