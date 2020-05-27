import * as ts from "typescript"
import fs from 'fs'
import path from 'path'
// const languageService: ts.LanguageService = ts.createLanguageService()

// const formatFile = (sourceFile, filePath) => {
//   const textChanges = languageService.getFormattingEditsForDocument(filePath, {
//       convertTabsToSpaces: true,
//       insertSpaceAfterCommaDelimiter: true,
//       insertSpaceAfterKeywordsInControlFlowStatements: true,
//       insertSpaceBeforeAndAfterBinaryOperators: true,
//       newLineCharacter: "\n",
//       indentStyle: ts.IndentStyle.Smart,
//       indentSize: 4,
//       tabSize: 4
//   });

//   let finalText = sourceFile.getFullText();

//   for (const textChange in textChanges.sort((a, b) => b.span.start - a.span.start)) {
//       const {span} = textChange;
//       finalText = finalText.slice(0, span.start) + textChange.newText
//           + finalText.slice(span.start + span.length);
//   }

//   console.log(finalText)
// }


const chooseShorter = (originalPath: string, newPath: string) =>
  (originalPath.length < newPath.length) ? originalPath : newPath

const checkReplace = (importPath: string, replace: string[][]) => {
  for (const [match, sub] of replace) {
    if (importPath.startsWith(match)) {
      return importPath.replace(match, sub)
    }
  }
}

function extract(replace: string[][], options: { leaveIfShorter?: Boolean, previewChanges?: Boolean, onlyShowChanged? : Boolean } = {}): void {
  const configPath = ts.findConfigFile(
    "./", /*searchPath*/ 
    ts.sys.fileExists,
    "tsconfig.json"
  );

  if (!configPath) throw new Error("Could not find a valid 'tsconfig.json'.");

  const configFile = ts.readJsonConfigFile(configPath, ts.sys.readFile);

  const { fileNames } = ts.parseJsonSourceFileConfigFileContent(
    configFile,
    ts.sys,
    './'
  );

  // To print the AST, we'll use TypeScript's printer
  const printer = ts.createPrinter();

  fileNames.map(filePath => {
    // Create a Program to represent the project, then pull out the
    // source file to parse its AST.
    let program = ts.createProgram([filePath], { allowJs: true });

    const sourceFile = program.getSourceFile(filePath) as ts.SourceFile;

    if (options.previewChanges) {
      console.log({ filePath })
    }

    const filePathWithoutFile = path.dirname(filePath);

    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, node => {
      if (node.kind == ts.SyntaxKind.ImportDeclaration) {
        const { text: importPath } = ((node as ts.ImportDeclaration).moduleSpecifier as ts.ModuleName);

        if (importPath.startsWith(".")) {
          const pathFromRoot = path.join(filePathWithoutFile, importPath)
          const pathWithAlias = checkReplace(pathFromRoot, replace) || importPath

          const output = options.leaveIfShorter ? chooseShorter(importPath, pathWithAlias) : pathWithAlias

          if (options.previewChanges) {
            if (importPath === output) {   
              if (!options.onlyShowChanged) {
                console.log({ keep: importPath })
              }
            } else {
              console.log({ previous: importPath, new: output })
            }
          }

          const moduleSpecifier = ((node as ts.ImportDeclaration).moduleSpecifier as ts.ModuleName);
          (node as ts.ImportDeclaration).moduleSpecifier = { ...moduleSpecifier, text: output } as ts.ModuleName
        } else {
          if (options.previewChanges && !options.onlyShowChanged) {
            console.log({ ignored: importPath })
          }
        }
      }
    });

    try {
      fs.writeFileSync(filePath, sourceFile.getFullText())
    } catch (e) {
      console.log(e)
    }
  })
}

// Run the extract function with the script's arguments
// extract(process.argv.slice(2));


const replace = [
  ["src/app/", "@app/"],
  ["src/services/", "@services/"],
  ["src/stubs/", "@stubs/"],
  ["tests/*", "@tests/"]
]

extract(replace, { leaveIfShorter: true, previewChanges: true, onlyShowChanged: true })
