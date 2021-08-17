const replace = require('replace-in-file');
const jsonData = require('./test.json');
const path = require('path');
const util = require('util')
const fs = require('fs')
const projectId = 'translate-323112';
const {Translate} = require('@google-cloud/translate').v2;
const translate = new Translate({projectId});



let matches = jsonData.filter(e => e.type == 'match')
const data_only = matches.map(e => ({path: e.data.path.text, text: e.data.submatches[0].match.text, line: e.data.line_number}))

const create_prefix = filePath => path.basename(filePath).replace('.html', '').replace(/app_\d_/, '')
const extract_text = e => e.replace('>', '').replace(/(\W|\d)*/, '')
const create_suffix = text => extract_text(text).match(/(\w+\s?){1,3}/)[0].trim().replace(/\s/g, '_').toLowerCase()

const sort_text = (a, b) => a.text.length - b.text.length
const get_longest_message = (array, e) => array.filter(best => best.path == e.path && best.line == e.line).sort(sort_text).reverse()[0]
const remove_substring = array =>
  array.filter(e => {
    const best = get_longest_message(array, e)
    return !extract_text(e.text) && !(best.text !== e.text && best.text.includes(e.text))
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

  if (duplicate)
    e.index = duplicate.index;
  return e
}

const names = remove_substring(data_only).map(create_index)

const uniq = []
const unique_text = names.filter(e => {
  if (uniq.includes(e.text)) return false
  uniq.push(e.text)
  return true
})


const result_i18n_en = e => e.map(e => `${e.index} = ${e.anglais}`)
const result_i18n_fr = e => e.map(e => `${e.index} = ${e.francais}`)

const generate_message_en_properties = e => fs.appendFile('src/main/resources/i18n/messages.properties', result_i18n_en(e).join('\n'), _ => _)
const generate_message_fr_properties = e => fs.appendFile('src/main/resources/i18n/messages_fr.properties', result_i18n_fr(e).join('\n'), _ => _)

const replace_text_by_tag = data =>
  data.sort(sort_text).forEach(e => {replace.sync({files:e.path, from:e.text, to: ` th:utext="#{${e.index}}">`})})

const translate_text = async(e) => await translate.translate(e, 'fr')

const trad = async (e) => {
  const text = e.text.replace('>', '').replace(/\s+/g, ' ').trim()
  return {index:e.index, anglais: text, francais: (await translate_text(text))[0]}
}

const res = unique_text.map(trad)

const create_json = el =>
fs.writeFile("trad.json", JSON.stringify(el, null, '\t'), _ => _);

// Promise.all(res).then(create_json)
Promise.all(res).then(e => {
  generate_message_en_properties(e)
  generate_message_fr_properties(e)
})
// replace_text_by_tag(names.map(remove_duplicate))
// console.log(JSON.stringify(no_duplicate_index, null, '\t'))
