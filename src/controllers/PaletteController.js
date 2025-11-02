/**
 * Controller for handling the communication with the palette module.
 * @author Smilla Sollén <ss226uk@student.lnu.se>
 * @version 1.0.0
 */

import Palette from '../models/Palette.js';
import { WcagColorService } from "wcag-color-service";
import ValidationError from '../errors/ValidationError.js';
import DatabaseError from '../errors/DatabaseError.js';

const wcagColorService = new WcagColorService();

export default class PaletteController {
    async generatePalette(context) {
        try {
            const { basecolor, level, isLargeText } = this.#validateGenerateInput(context.req.body);
            const palette = this.#createPalette(basecolor, level, isLargeText);
            context.render('palette', { palette, basecolor, level, isLargeText });
        } catch (error) {
            context.fail(error);
        }
    }

    async savePalette(context) {
        try {
            const paletteData = this.#validateSaveInput(context.req.body);
            await this.#savePaletteToDB(paletteData);
            context.redirect('/palette', `Palette "${paletteData.name}" saved successfully!`);
        } catch (error) {
            context.fail(error instanceof ValidationError ? error : new DatabaseError('Failed to save palette.'));
        }
    }

    async showAllPalettes(context) {
        try {
            const page = parseInt(context.req.query.page) || 1
            const perPage = 10

            const { palettes, totalPages } = await this.#fetchPaginatedPalettes(page, perPage)

            context.render('palettes', {
                palettes,
                currentPage: page,
                totalPages,
                flash: context.req.flash()
            })
        } catch {
            context.fail(new DatabaseError('Failed to fetch palettes.'))
        }
    }

    async deletePalette(context) {
        try {
            await this.#deletePaletteById(context.req.params.id);
            context.redirect('/palette', 'Palette deleted successfully.');
        } catch {
            context.fail(new DatabaseError('Failed to delete palette.'));
        }
    }

    #validateGenerateInput({ basecolor, level, isLargeText }) {
        if (!basecolor || !level) {
            throw new ValidationError('Missing required fields.');
        }

        return {
            basecolor,
            level,
            isLargeText: String(isLargeText) === 'true'
        };
    }

    #validateSaveInput({ name, basecolor, colors, level, isLargeText }) {
        if (!name || !basecolor || !colors || !level) {
            throw new ValidationError('Missing required fields.');
        }

        return {
            name,
            basecolor,
            colors: JSON.parse(colors),
            level,
            isLargeText: isLargeText === 'true'
        };
    }

    #createPalette(basecolor, level, isLargeText) {
        return wcagColorService.generatePalette({ basecolor, level, isLargeText });
    }

    async #savePaletteToDB(paletteData) {
        const palette = new Palette(paletteData);
        await palette.save();
    }

    async #fetchPaginatedPalettes(page, perPage) {
        const totalPalettes = await Palette.countDocuments()
        const palettes = await Palette.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .lean()

        const totalPages = Math.ceil(totalPalettes / perPage)
        return { palettes, totalPages }
    }

    async #deletePaletteById(id) {
        await Palette.findByIdAndDelete(id);
    }
}