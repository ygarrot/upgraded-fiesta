const argv = require('minimist')(process.argv.slice(2));
const {Translate} = require('@google-cloud/translate').v2;
const replace = require('replace-in-file');
const path = require('path');
const util = require('util')
const fs = require('fs')
const projectId = 'translate-323112';
const translate = new Translate({projectId});

const jsonData = require(argv.file || './test.json');
const config = require(argv.config_file || './config.json');

const syntax = {
  html: e => e.replace('>', '').replace(/(\W|\d)*/, '').replace(/\s+/g, ' ').trim(),
  placeholder: e => e.replace(/\"/g, '').replace('placeholder=', '').trim(),
}

const index = {
  html: text => ` th:text="#{${text}}">`,
  placeholder: text =>` th:placeholder="#{${text}}"`
}

const extract_text = syntax.placeholder

const matches = jsonData.filter(e => e.type == 'match')
const data_only = matches.map(e => ({path: e.data.path.text, text: e.data.submatches[0].match.text, line: e.data.line_number}))

const create_prefix = filePath => path.basename(filePath).replace('.html', '').replace(/app_\d_/, '')
const create_suffix = text => extract_text(text).match(/(\w+\s?){1,3}/)[0].trim().replace(/\s/g, '_').toLowerCase()

const sort_text = (a, b) => b.text.length - a.text.length
const get_longest_message = (array, e) => array.filter(best => best.path == e.path && best.line == e.line).sort(sort_text).reverse()[0]
const remove_substring = array =>
  array.filter(e => {
    const best = get_longest_message(array, e)
    return extract_text(e.text).length > 0 && !(best.text !== e.text && best.text.includes(e.text))
  })

let all_index = []
const create_index = e => {
  const index = [create_prefix(e.path), create_suffix(e.text)].join('_')
  let tmp = index
  let n = 1;

  while (all_index.includes(tmp)) {
    n++;
    tmp = `${index}_${n}`
  }
  all_index += tmp
  return { ...e, index: tmp }
}

const remove_duplicate = e => {
  const duplicate = names.find(el => el.text === e.text)
  if (duplicate) e.index = duplicate.index;
  return e
}

const names = remove_substring(data_only).map(create_index)

const uniq = []
const filter_unique = e => {
  if (uniq.includes(e.text)) return false
  uniq.push(e.text)
  return true
}

const i18n_file_row = {
  en: e => e.map(e => `${e.index} = ${e.anglais}`),
  fr: e => e.map(e => `${e.index} = ${e.francais}`)
}

const generate_message = {
  en: e => fs.appendFile(config.properties.en, i18n_file_row.en(e).join('\n'), _ => _),
  fr: e => fs.appendFile(config.properties.fr, i18n_file_row.fr(e).join('\n'), _ => _)
}

const replace_text_by_tag = (data, indexify) =>
  data.sort(sort_text).forEach(e => replace.sync({files: e.path, from:e.text, to: indexify(e.index)}) )

const translate_text = async(e) => await translate.translate(e, 'fr')

const toTranslate = async (e) => {
  const text = extract_text(e.text)
  return {index: e.index, anglais: text, francais: (await translate_text(text))[0]}
}

const translations = names.filter(filter_unique).map(toTranslate)

const create_json = el => fs.writeFile(config.result_trad_file, JSON.stringify(el, null, '\t'), console.error);

replace_text_by_tag(names.map(remove_duplicate), index.placeholder)
Promise.all(translations).then(create_json)
Promise.all(translations).then(e => {
  generate_message.fr(e)
  generate_message.en(e)
})
// console.log(JSON.stringify(names.map(remove_duplicate).sort(sort_text), null, '\t'))
// console.log(JSON.stringify(no_duplicate_index, null, '\t'))
